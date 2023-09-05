/* eslint-disable no-unused-vars */
/* eslint-disable no-shadow */
import * as core from 'express-serve-static-core';
import { IUser } from '../../models/userModel';

declare module 'express-serve-static-core' {
    interface Request {
        user?: IUser;
    }
}
