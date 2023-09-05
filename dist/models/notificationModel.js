"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const notificationSchema = new mongoose_1.Schema({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    sendOut: {
        type: Date,
        required: [true, 'Необходимо указать дату отправки уведомления'],
    },
    title: {
        type: String,
        required: [true, 'Необходимо указать заголовок уведомления'],
    },
    content: {
        type: String,
        required: [true, 'Необходимо указать содержимое уведомления'],
    },
    image: String,
    link: String,
    receivers: [mongoose_1.Schema.Types.ObjectId],
    readBy: [mongoose_1.Schema.Types.ObjectId],
    hiddenFor: [mongoose_1.Schema.Types.ObjectId],
});
const Notification = (0, mongoose_1.model)('th-notifications', notificationSchema);
exports.default = Notification;
