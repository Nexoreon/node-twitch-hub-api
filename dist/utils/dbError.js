"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DBError extends Error {
    code;
    status;
    isOperational;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.status = 'fail';
        this.isOperational = true;
        this.name = 'DBError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.default = DBError;
