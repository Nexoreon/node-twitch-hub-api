/* eslint-disable no-console */
import { Types } from 'mongoose';
import chalk from 'chalk';
import nodeSchedule from 'node-schedule';
import AppError from './appError';
import pushNotification from './beamsClient';
import Notification, { INotification } from '../models/notificationModel';

export const toObjectId = (id: string) => new Types.ObjectId(id);
export const sendError = (msg: string, statusCode: number) => new AppError(msg, statusCode);

// Create App Notification
export const createNotification = async (ntfData: object) => {
    await Notification.create(ntfData)
    .then(() => console.log(chalk.green('[Система уведомлений]: Уведомление успешно добавлено в приложение')))
    .catch((err: unknown) => console.log(chalk.red('[Система уведомлений]: Ошибка добавления уведомления в приложение'), err));
};

// Send delayed push notification
export const sendNotificationLater = (ntf: INotification) => {
    nodeSchedule.scheduleJob(ntf.sendOut, () => {
        pushNotification.publishToInterests(['project'], {
            web: {
                notification: {
                    title: ntf.title,
                    body: ntf.content,
                    deep_link: ntf.link,
                    ...(ntf.image.length && { icon: ntf.image }),
                },
            },
        })
        .then(() => console.log('[Pusher]: Уведомление успешно отправлено!'))
        .catch((err: unknown) => console.log(chalk.red('[Pusher]: Ошибка отправки уведомления!'), err));
    });
    console.log(chalk.blueBright(`[Система уведомлений]: Отправка запланирована ${new Date(ntf.sendOut).toLocaleDateString()}`));
};
