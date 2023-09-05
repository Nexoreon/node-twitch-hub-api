/* eslint-disable no-unused-vars */

import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/appError';

export interface IError extends AppError {
    index: number;
    code: number;
    errmsg: string;
    keyPattern: object;
    keyValue: object;
    path: string;
    value: string;
    errors: { message: string }[];
}

const sendDevErrors = (err: IError, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status,
        statusCode: err.statusCode,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};

const sendProdErrors = (err: IError, res: Response) => {
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }

    res.status(500).json({
        status: 'error',
        message: 'Что-то пошло не так',
    });
};

const handleCastErrorDB = (err: IError) => {
    const message = `Неправильный путь для: ${err.path}. Указанный путь: ${err.value}`;
    return new AppError(message, 404);
};

const handleDuplicateFieldsDB = (err: IError) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)![0];
    const message = `Обнаружен дубликат значения: ${value}. Пожалуйста, используйте другое значение`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err: IError) => {
    const errors = Object.values(err.errors).map((val) => val.message);
    const message = `Неправильно введенные данные. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Невалидный токен. Пожалуйста переавторизируйтесь!', 401);
const handleJWTExpiredError = () => new AppError('Ваш токен авторизации истёк! Пожалуйста переавторизируйтесь!', 401);

export default (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (err.name === 'CastError') err = handleCastErrorDB(err);
    if (err.code === 11000) err = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError') err = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') err = handleJWTError();
    if (err.name === 'TokenExpiredError') err = handleJWTExpiredError();

    if (process.env.NODE_ENV === 'development') return sendDevErrors(err, res);
    if (process.env.NODE_ENV === 'production') return sendProdErrors(err, res);
};
