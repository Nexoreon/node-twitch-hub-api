"use strict";
/* eslint-disable no-unused-vars */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const appError_1 = __importDefault(require("../utils/appError"));
const sendDevErrors = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        statusCode: err.statusCode,
        message: err.message,
        error: err,
        stack: err.stack,
    });
};
const sendProdErrors = (err, res) => {
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
const handleCastErrorDB = (err) => {
    const message = `Неправильный путь для: ${err.path}. Указанный путь: ${err.value}`;
    return new appError_1.default(message, 404);
};
const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Обнаружен дубликат значения: ${value}. Пожалуйста, используйте другое значение`;
    return new appError_1.default(message, 400);
};
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((val) => val.message);
    const message = `Неправильно введенные данные. ${errors.join('. ')}`;
    return new appError_1.default(message, 400);
};
// TODO: Handle token related error
const handleExpiredToken = (err) => {
    console.log(err);
    return new appError_1.default('Twitch token expired. Restart your application to get new one!', 401);
};
const handleJWTError = () => new appError_1.default('Невалидный токен. Пожалуйста переавторизируйтесь!', 401);
const handleJWTExpiredError = () => new appError_1.default('Ваш токен авторизации истёк! Пожалуйста переавторизируйтесь!', 401);
exports.default = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    if (err.name === 'CastError')
        err = handleCastErrorDB(err);
    if (err.code === 11000)
        err = handleDuplicateFieldsDB(err);
    if (err.name === 'ValidationError')
        err = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError')
        err = handleJWTError();
    if (err.name === 'TokenExpiredError')
        err = handleJWTExpiredError();
    // if (err.response.status === 404) err = handleExpiredToken(err);
    if (process.env.NODE_ENV === 'development')
        return sendDevErrors(err, res);
    if (process.env.NODE_ENV === 'production')
        return sendProdErrors(err, res);
};
