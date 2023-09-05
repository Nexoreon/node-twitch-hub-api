import Settings from '../models/settingsModel';
import catchAsync from '../utils/catchAsync';
import { sendError } from '../utils/functions';

// possible errors
const sendError404 = sendError('Сначала инициализируйте настройки!', 404);
const sendError403 = sendError('Настройки были инициализированы ранее!', 403);

export const createSettings = catchAsync(async (req, res, next) => {
    const checkSettings = await Settings.find();
    if (checkSettings.length) return next(sendError403);
    await Settings.create(req.body);

    res.status(201).json({
        status: 'ok',
        message: 'Настройки успешно инициализированы!',
    });
});

export const getSettings = catchAsync(async (req, res, next) => {
    const settings = await Settings.find();
    if (!settings.length) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: settings[0],
    });
});

export const updateSettings = catchAsync(async (req, res, next) => {
    const settings = await Settings.updateOne({}, { $set: { ...req.body } });
    if (!settings) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        message: 'Настройки успешно обновлены',
    });
});
