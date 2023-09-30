"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = exports.sendNotificationLater = exports.createNotification = exports.sendError = exports.toObjectId = void 0;
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const mongoose_1 = require("mongoose");
const chalk_1 = __importDefault(require("chalk"));
const node_schedule_1 = __importDefault(require("node-schedule"));
const appError_1 = __importDefault(require("./appError"));
const beamsClient_1 = __importDefault(require("./beamsClient"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const toObjectId = (id) => new mongoose_1.Types.ObjectId(id);
exports.toObjectId = toObjectId;
const sendError = (msg, statusCode) => new appError_1.default(msg, statusCode);
exports.sendError = sendError;
// Create App Notification
const createNotification = async (ntfData) => {
    await notificationModel_1.default.create(ntfData)
        .then(() => console.log(chalk_1.default.green('[Система уведомлений]: Уведомление успешно добавлено в приложение')))
        .catch((err) => console.log(chalk_1.default.red('[Система уведомлений]: Ошибка добавления уведомления в приложение'), err));
};
exports.createNotification = createNotification;
// Send delayed push notification
const sendNotificationLater = (ntf) => {
    node_schedule_1.default.scheduleJob(ntf.sendOut, () => {
        beamsClient_1.default.publishToInterests(['project'], {
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
            .catch((err) => console.log(chalk_1.default.red('[Pusher]: Ошибка отправки уведомления!'), err));
    });
    console.log(chalk_1.default.blueBright(`[Система уведомлений]: Отправка запланирована ${new Date(ntf.sendOut).toLocaleDateString()}`));
};
exports.sendNotificationLater = sendNotificationLater;
const initializeApp = async (settings) => {
    const getNewAccessToken = async () => {
        await axios_1.default.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT}&client_secret=${process.env.TWITCH_SECRET}&grant_type=client_credentials`)
            .then(async (resp) => {
            const { data } = resp;
            await settingsModel_1.default.updateOne({}, { accessToken: `Bearer ${data.access_token}` });
            console.log(chalk_1.default.green('[Server]: New server token successfully saved. Restart your application'));
            process.exit(1);
        })
            .catch((err) => {
            console.log(chalk_1.default.red('[Server]: Error while getting new server token!'), err);
            process.exit(1);
        });
    };
    if (settings && settings.accessToken) {
        // If token exists in db
        const { accessToken } = settings;
        await axios_1.default.get('https://api.twitch.tv/helix/games/top', {
            headers: {
                Authorization: accessToken,
                'client-id': process.env.TWITCH_CLIENT,
            },
        })
            .then(() => {
            console.log(chalk_1.default.green('[Server]: Successful connection to Twitch API'));
            process.env.TWITCH_TOKEN = accessToken;
        })
            .catch((err) => {
            if (err.response && err.response.status === 401) {
                console.log(chalk_1.default.yellow('[Server]: Server token expired! Trying to get new one...'));
                return getNewAccessToken();
            }
            console.log(chalk_1.default.red('[Server]: Test response failed'), err);
            process.exit(1);
        });
    }
    else if (settings && !settings.accessToken && !process.env.TWITCH_TOKEN) {
        // No token found in db and .env file
        console.log(chalk_1.default.red('[Server]: You need to specify Twitch server token at least once in config.env file'));
        process.exit(1);
    }
    else if (settings && !settings.accessToken && process.env.TWITCH_TOKEN) {
        // Token exists in .env file, but not in db. Saves token into db
        await settingsModel_1.default.updateOne({}, { accessToken: process.env.TWITCH_TOKEN });
        console.log(chalk_1.default.green('[Server]: Token has been saved. Restart your application'));
        process.exit(1);
    }
    else if (!settings) {
        // No app configuration found. Initializes basic configuration
        console.log(chalk_1.default.yellow('[Server]: App configuration is not being initialized yet. Initializing now...'));
        await settingsModel_1.default.create({})
            .then(() => {
            console.log(chalk_1.default.green('[Server]: Successfully initialized configuration data. Restart your application'));
            process.exit(1);
        });
    }
    else {
        console.log(chalk_1.default.red('[Server]: Unknown error, shutting down...'));
        process.exit(1);
    }
};
exports.initializeApp = initializeApp;
