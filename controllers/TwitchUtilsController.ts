/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import catchAsync from '../utils/catchAsync';
import { sendError, twitchHeaders } from '../utils/functions';
import { convertDuration } from '../apps/TwitchCommon';
import Settings from '../models/settingsModel';
import TwitchReport from '../models/twitchReportModel';
import TwitchReportBackup from '../models/twitchReportBackupModel';
import TwitchStreamer, { ITwitchStreamer } from '../models/twitchStreamerModel';
import TwitchWatchlist, { ITwitchWatchlist } from '../models/twitchWatchlistModel';
import { IResponseStreamer, IResponseVod } from '../types/types';
import { IMongoDBError, OperationError } from './errorController';

// possible errors
const sendError404Streamer = sendError('Такого стримера не найдено в датабазе!', 404);
const sendErrorDataFetch = sendError('Ошибка получения данных от Twitch', 500);
const sendErrorSettingsNotInit = sendError('Настройки приложения не инициализированы!', 403);

export const checkReports = catchAsync(async (req, res) => {
    let hasAnomaly: boolean = false;
    const reports = await TwitchReport.countDocuments();
    const latestReport = await TwitchReport.findOne().sort({ timestamp: -1 }).select({ timestamp: 1 });
    if (reports < 10) hasAnomaly = true;

    res.status(200).json({
        status: 'ok',
        data: {
            hasAnomaly,
            amount: reports,
            latest: latestReport,
        },
    });
});

export const createReportsBackup = catchAsync(async (req, res) => {
    const reports = await TwitchReport.find();

    await TwitchReportBackup.deleteMany();
    await TwitchReportBackup.insertMany(reports);

    res.status(200).json({
        status: 'ok',
        message: 'Резервная копия отчётов успешно создана',
    });
});

export const importFollowList = catchAsync(async (req, res) => {
    // Get existing and current follow list
    const currentFollowList = await TwitchStreamer.find();
    const currentFollowListIds = currentFollowList.map((s: ITwitchStreamer) => s.id);
    const getFollowList = await axios.get(`https://api.twitch.tv/helix/users/follows?first=100&from_id=${process.env.TWITCH_USER_ID}`, {
        headers: twitchHeaders,
    });

    const followList = getFollowList.data.data;

    // Check for new streamers
    const followIds: string[] = [];
    const newIds: string[] = [];
    await followList.map((streamer: IResponseStreamer) => {
        followIds.push(streamer.to_id);
        if (!currentFollowListIds.includes(streamer.to_id)) newIds.push(`id=${streamer.to_id}`);
    });

    // Check for unfollowed streamers
    currentFollowListIds.map(async (id: string) => {
        if (!followIds.includes(id)) await TwitchStreamer.findOneAndDelete({ id });
    });

    // Add new streamers
    if (!newIds.length) {
        res.status(200).json({ status: 'ok', message: 'Новых отслеживаемых стримеров не обнаружено!' });
        return;
    }
    const getStreamersData = await axios.get(`https://api.twitch.tv/helix/users?${newIds.join('&')}`, {
        headers: twitchHeaders,
    });

    const streamersData = getStreamersData.data.data;
    const preparedData: { id: string; login: string; name: string; avatar: string; }[] = [];
    await streamersData.map((streamer: IResponseStreamer) => {
        preparedData.push({
            id: streamer.id,
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url,
        });
    });

    preparedData.map(async (streamer) => {
        await TwitchStreamer.create(streamer)
        .catch((err: IMongoDBError) => console.log('Ошибка добавления стримера', err));
    });

    res.status(200).json({
        status: 'ok',
        message: 'Список стримеров успешно импортирован',
    });
});

export const searchGame = catchAsync(async (req, res) => {
    const { gameName } = req.query;

    const response = await axios.get(`https://api.twitch.tv/helix/search/categories?query=${gameName}`, {
        headers: twitchHeaders,
    });

    res.status(200).json({
        status: 'ok',
        data: response.data.data,
    });
});

export const searchStreamer = catchAsync(async (req, res) => {
    const { search } = req.query;

    const response = await await axios.get(`https://api.twitch.tv/helix/search/channels?query=${search}`, {
        headers: twitchHeaders,
    });

    res.status(200).json({
        status: 'ok',
        data: response.data.data,
    });
});

export const resetNotificationStatus = catchAsync(async (req, res) => {
    await TwitchStreamer.updateMany({ 'flags.notifyOnNextGame': true }, { $set: { 'flags.notifyOnNextGame': false } });

    res.status(200).json({
        status: 'ok',
        message: 'Статусы уведомлений при смене игры стримером успешно сбросаны!',
    });
});

export const getVodsData = catchAsync(async (req, res, next) => {
    const vods = await TwitchWatchlist.find({ duration: { $exists: false }, platform: 'Twitch', 'flags.isAvailable': true });
    const ids = vods.map((vod: ITwitchWatchlist) => `id=${vod.id}`);

    if (!ids.length) res.status(400).json({ status: 'fail', message: 'Видео без данных отсутствуют' });
    if (ids.length) {
        await axios.get(`https://api.twitch.tv/helix/videos?${ids.join('&')}`, {
            headers: twitchHeaders,
        })
        .then(async (resp) => {
            const items = await resp.data.data;
            await items.map(async (vod: IResponseVod) => {
                if (!vod.thumbnail_url.includes('404_processing')) {
                    await TwitchWatchlist.findOneAndUpdate({ id: vod.id }, {
                        $set: {
                            duration: convertDuration(vod.duration),
                            thumbnail: vod.thumbnail_url,
                        },
                    })
                    .catch((err: IMongoDBError) => console.log(chalk.red('[Twitch Watchlist]: Ошибка обновления информации о видео!'), err));
                }
            });
        })
        .then(() => {
            res.status(200).json({
                status: 'ok',
                message: 'Данные обновлены для доступных видео',
            });
        })
        .catch((err: OperationError) => {
            console.log(chalk.red('[Twitch Watchlist]: Невозможно получить данные для удаленных видео'), err);
            return next(sendErrorDataFetch);
        });
    }
});

export const getNotificationData = catchAsync(async (req, res) => {
    const streamers = await TwitchStreamer.find({}, { id: 1, name: 1, avatar: 1, 'flags.notifyOnNewGame': 1 });
    const enabledForAll = streamers.every((streamer: ITwitchStreamer) => streamer.flags.notifyOnNewGame === true);

    const settings = await Settings.find();
    const { notifications } = settings[0];

    res.status(200).json({
        status: 'ok',
        data: {
            streamers: {
                items: streamers,
                total: streamers.length,
                enabledForAll,
            },
            notifications,
        },
    });
});

export const setNotificationParam = catchAsync(async (req, res, next) => {
    const { param, enabled, enabledForAll } = req.body;

    if (enabledForAll !== undefined) {
        await TwitchStreamer.updateMany({}, { $set: { 'flags.notifyOnNewGame': enabledForAll } });
        res.status(200).json({
            status: 'ok',
            message: 'Статус уведомлений для всех стримеров изменён!',
        });
        return;
    }

    if (param.length !== 8) {
        const updateParam = await Settings.findOneAndUpdate({}, { $set: { [`notifications.${param}`]: enabled } });
        if (!updateParam) return next(sendErrorSettingsNotInit);
        res.status(200).json({
            status: 'ok',
            message: 'Статус уведомления для этого параметра изменён',
        });
        return;
    }

    const streamer = await TwitchStreamer.findOneAndUpdate({ id: param }, { $set: { 'flags.notifyOnNewGame': enabled } });
    if (!streamer) return next(sendError404Streamer);

    res.status(200).json({
        status: 'ok',
        message: 'Статус уведомлений для этого стримера изменён',
    });
});
