/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const catchAsync = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
    fn(req, res, next).catch(next);
};

export default catchAsync;
