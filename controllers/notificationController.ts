import catchAsync from '../utils/catchAsync';
import { toObjectId, sendError, sendNotificationLater } from '../utils/functions';
import Notification from '../models/notificationModel';

const sendError404 = sendError('Такого уведомления не найдено в системе!', 404);

export const createNotification = catchAsync(async (req, res) => {
    const { image, sendOut, date } = req.body;
    const newNotification = await Notification.create({
        ...req.body,
        ...(image && { image: `https://192.168.0.100/site/public/img/${image[0]}` }),
        sendOut: date || sendOut,
        receivers: [toObjectId(process.env.USER_ID!)],
    });

    if (sendOut !== Date.now()) sendNotificationLater(req.body);
    res.status(201).json({
        status: 'ok',
        data: newNotification,
    });
});

export const getNotifications = catchAsync(async (req, res) => {
    const { archive, limit } = req.query;
    const { _id: userId } = req.user!;
    const getQuery = (body: object) => Notification.find(body);
    let query: ReturnType<typeof getQuery> = getQuery({});

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

    const notifications = await query.sort({ createdAt: -1 }).limit(+limit!);
    const total = await Notification.countDocuments({
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

export const getNotification = catchAsync(async (req, res, next) => {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: notification,
    });
});

export const updateNotification = catchAsync(async (req, res, next) => {
    const { markAsRead, hide, clearAll } = req.query;
    const { _id: userId } = req.user!;
    const getQuery = (body: object) => Notification.findByIdAndUpdate(req.params.id, body, {
        new: true,
    });

    let query: unknown = getQuery(req.body);
    if (markAsRead) query = getQuery({ $addToSet: { readBy: userId } });
    if (hide) query = getQuery({ $addToSet: { hiddenFor: userId } });
    if (clearAll) {
        query = Notification.updateMany(
            { receivers: { $in: userId } },
            { $addToSet: {
                hiddenFor: userId,
                readBy: userId,
            } });
    }

    const notification = await query;
    if (!notification) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: notification,
    });
});

export const deleteNotification = catchAsync(async (req, res, next) => {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    if (!notification) return next(sendError404);

    res.status(204).json({
        status: 'ok',
    });
});
