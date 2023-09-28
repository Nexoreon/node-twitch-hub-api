/* eslint-disable no-console */
import axios, { AxiosError, AxiosResponse } from 'axios';
import { Types } from 'mongoose';
import chalk from 'chalk';
import nodeSchedule from 'node-schedule';
import AppError from './appError';
import pushNotification from './beamsClient';
import Notification, { INotification } from '../models/notificationModel';
import Settings, { ISettings } from '../models/settingsModel';
import { IResponseToken } from '../types/types';

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

export const initializeApp = async (settings: ISettings | null) => {
    const getNewAccessToken = async () => {
        await axios.post(
            `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`,
        )
        .then(async (resp: AxiosResponse) => {
            const { data }: { data: IResponseToken } = resp;
            await Settings.updateOne({}, { accessToken: data.access_token });
            console.log(chalk.green('[Server]: New server token successfully saved. Restart your application'));
            process.exit(1);
        })
        .catch((err: AxiosError) => {
            console.log(chalk.red('[Server]: Error while getting new server token!'), err);
            process.exit(1);
        });
    };

    if (settings && settings.accessToken) {
        // If token exists in db
        const { accessToken } = settings;
        await axios.get('https://api.twitch.tv/helix/games/top', {
            headers: {
                Authorization: process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT,
            },
        })
        .then(() => {
            console.log(chalk.green('[Server]: Successful connection to Twitch API'));
            process.env.TWITCH_TOKEN = accessToken;
        })
        .catch((err: AxiosError) => {
            if (err.response && err.response.status === 401) {
                console.log(chalk.yellow('[Server]: Server token expired! Trying to get new one...'));
                return getNewAccessToken();
            }

            console.log(chalk.red('[Server]: Test response failed'), err);
            process.exit(1);
        });
    } else if (settings && !settings.accessToken && !process.env.TWITCH_TOKEN) {
        // No token found in db and .env file
        console.log(chalk.red('[Server]: You need to specify Twitch server token at least once in config.env file'));
        process.exit(1);
    } else if (settings && !settings.accessToken && process.env.TWITCH_TOKEN) {
        // Token exists in .env file, but not in db. Saves token into db
        await Settings.updateOne({}, { accessToken: process.env.TWITCH_TOKEN });
        console.log(chalk.green('[Server]: Token has been saved. Restart your application'));
        process.exit(1);
    } else if (!settings) {
        // No app configuration found. Initializes basic configuration
        console.log(chalk.yellow('[Server]: App configuration is not being initialized yet. Initializing now...'));
        await Settings.create({})
        .then(() => {
            console.log(chalk.green('[Server]: Successfully initialized configuration data. Restart your application'));
            process.exit(1);
        });
    } else {
        console.log(chalk.red('[Server]: Unknown error, shutting down...'));
        process.exit(1);
    }
};
