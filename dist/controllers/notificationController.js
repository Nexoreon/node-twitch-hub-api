"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteNotification = exports.updateNotification = exports.getNotification = exports.getNotifications = exports.createNotification = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
const notificationModel_1 = __importDefault(require("../models/notificationModel"));
const sendError404 = (0, functions_1.sendError)('Такого уведомления не найдено в системе!', 404);
exports.createNotification = (0, catchAsync_1.default)(async (req, res) => {
    const { image, sendOut, date } = req.body;
    const newNotification = await notificationModel_1.default.create({
        ...req.body,
        ...(image && { image: `https://192.168.0.100/site/public/img/${image[0]}` }),
        sendOut: date || sendOut,
        receivers: [(0, functions_1.toObjectId)(process.env.USER_ID)],
    });
    if (sendOut !== Date.now())
        (0, functions_1.sendNotificationLater)(req.body);
    res.status(201).json({
        status: 'ok',
        data: newNotification,
    });
});
exports.getNotifications = (0, catchAsync_1.default)(async (req, res) => {
    const { archive, limit } = req.query;
    const { _id: userId } = req.user;
    const getQuery = (body) => notificationModel_1.default.find(body);
    let query = getQuery({});
    if (userId && archive === 'true') {
        query = getQuery({
            receivers: { $in: userId },
            hiddenFor: { $in: userId },
            sendOut: { $lte: Date.now() },
        });
    }
    if (userId && archive === 'false') {
        query = getQuery({
            receivers: { $in: userId },
            hiddenFor: { $ne: userId },
            sendOut: { $lte: Date.now() },
        });
    }
    const notifications = await query.sort({ createdAt: -1 }).limit(+limit);
    const total = await notificationModel_1.default.countDocuments({
        receivers: { $in: userId },
        sendOut: { $lte: Date.now() },
    });
    const unread = await getQuery({
        receivers: { $in: userId },
        sendOut: { $lte: Date.now() },
        readBy: { $ne: userId },
    });
    res.status(200).json({
        status: 'ok',
        data: { items: notifications, total, unread: unread.length },
    });
});
exports.getNotification = (0, catchAsync_1.default)(async (req, res, next) => {
    const notification = await notificationModel_1.default.findById(req.params.id);
    if (!notification)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: notification,
    });
});
exports.updateNotification = (0, catchAsync_1.default)(async (req, res, next) => {
    const { markAsRead, hide, clearAll } = req.query;
    const { _id: userId } = req.user;
    const getQuery = (body) => notificationModel_1.default.findByIdAndUpdate(req.params.id, body, {
        new: true,
    });
    let query = getQuery(req.body);
    if (markAsRead)
        query = getQuery({ $addToSet: { readBy: userId } });
    if (hide)
        query = getQuery({ $addToSet: { hiddenFor: userId } });
    if (clearAll) {
        query = notificationModel_1.default.updateMany({ receivers: { $in: userId } }, { $addToSet: {
                hiddenFor: userId,
                readBy: userId,
            } });
    }
    const notification = await query;
    if (!notification)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: notification,
    });
});
exports.deleteNotification = (0, catchAsync_1.default)(async (req, res, next) => {
    const notification = await notificationModel_1.default.findByIdAndDelete(req.params.id);
    if (!notification)
        return next(sendError404);
    res.status(204).json({
        status: 'ok',
    });
});
