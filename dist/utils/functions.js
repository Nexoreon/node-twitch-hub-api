"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationLater = exports.createNotification = exports.sendError = exports.toObjectId = void 0;
/* eslint-disable no-console */
const mongoose_1 = require("mongoose");
const chalk_1 = __importDefault(require("chalk"));
const node_schedule_1 = __importDefault(require("node-schedule"));
const appError_1 = __importDefault(require("./appError"));
const beamsClient_1 = __importDefault(require("./beamsClient"));
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
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
