import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import './modules/SchedulerModule/SchedulerModule';
import './modules/TelegramBot/TelegramBotModule';
// import './modules/testModule';

import AppError from './utils/appError';
import globalErrorHandle from './controllers/errorController';
import systemRoutes from './routes/systemRoutes';
import twitchRoutes from './routes/twitchRoutes';

const app = express();
app.use(express.json());
app.use(morgan('dev'));
app.use(cors());
app.use('/', systemRoutes);
app.use('/api/v1/twitch', twitchRoutes);
app.use((req: Request, res: Response, next: NextFunction) => {
    next(new AppError(`Unable to find ${req.originalUrl} on the server`, 404));
});
app.use(globalErrorHandle);

export default app;
