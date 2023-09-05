import TwitchBan from '../models/twitchBanModel';
import catchAsync from '../utils/catchAsync';
import { sendError } from '../utils/functions';

// possible errors
const sendError404 = sendError('Такого стримера нету в списке забаненных!', 404);

export const banStreamer = catchAsync(async (req, res) => {
    let { expiresIn } = req.body;
    expiresIn = Date.now() + expiresIn * 3600000; // received hours * ms
    const newStreamer = await TwitchBan.create({ ...req.body, expiresIn });

    res.status(201).json({
        status: 'ok',
        data: newStreamer,
    });
});

export const getBannedStreamers = catchAsync(async (req, res) => {
    const bannedStreamers = await TwitchBan.find().sort({ date: -1 });

    res.status(200).json({
        status: 'ok',
        data: bannedStreamers,
    });
});

export const getBannedStreamer = catchAsync(async (req, res, next) => {
    const bannedStreamer = await TwitchBan.findById(req.params.id);
    if (!bannedStreamer) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: bannedStreamer,
    });
});

export const editBan = catchAsync(async (req, res, next) => {
    const { date, expiresIn, permanent, reason } = req.body;

    const bannedStreamer = await TwitchBan.findByIdAndUpdate(req.params.id, { date, expiresIn, permanent, reason }, { new: true });
    if (!bannedStreamer) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        message: 'Данные о блокировке успешно отредактированы',
    });
});

export const unbanStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchBan.findByIdAndDelete(req.params.id);
    if (!streamer) return next(sendError404);

    res.status(204).json({
        status: 'ok',
        message: 'Стример успешно разбанен',
    });
});
