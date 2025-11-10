"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testFunction = exports.setNotificationParam = exports.getNotificationData = exports.getVodsData = exports.resetNotificationStatus = exports.searchStreamer = exports.searchGame = exports.importFollowList = exports.createReportsBackup = exports.checkReports = void 0;
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
const TwitchCommon_1 = require("../apps/TwitchCommon");
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const twitchReportModel_1 = __importDefault(require("../models/twitchReportModel"));
const twitchReportBackupModel_1 = __importDefault(require("../models/twitchReportBackupModel"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const twitchWatchlistModel_1 = __importDefault(require("../models/twitchWatchlistModel"));
// possible errors
const sendError404Streamer = (0, functions_1.sendError)('Такого стримера не найдено в датабазе!', 404);
const sendErrorDataFetch = (0, functions_1.sendError)('Ошибка получения данных от Twitch', 500);
const sendErrorSettingsNotInit = (0, functions_1.sendError)('Настройки приложения не инициализированы!', 403);
exports.checkReports = (0, catchAsync_1.default)(async (req, res) => {
    let hasAnomaly = false;
    const reports = await twitchReportModel_1.default.countDocuments();
    const latestReport = await twitchReportModel_1.default.findOne().sort({ timestamp: -1 }).select({ timestamp: 1 });
    if (reports < 10)
        hasAnomaly = true;
    res.status(200).json({
        status: 'ok',
        data: {
            hasAnomaly,
            amount: reports,
            latest: latestReport,
        },
    });
});
exports.createReportsBackup = (0, catchAsync_1.default)(async (req, res) => {
    const reports = await twitchReportModel_1.default.find();
    await twitchReportBackupModel_1.default.deleteMany();
    await twitchReportBackupModel_1.default.insertMany(reports);
    res.status(200).json({
        status: 'ok',
        message: 'Резервная копия отчётов успешно создана',
    });
});
exports.importFollowList = (0, catchAsync_1.default)(async (req, res) => {
    // Get existing and current follow list
    const currentFollowList = await twitchStreamerModel_1.default.find();
    const currentFollowListIds = currentFollowList.map((s) => s.id);
    const getFollowList = await axios_1.default.get(`https://api.twitch.tv/helix/users/follows?first=100&from_id=${process.env.TWITCH_USER_ID}`, {
        headers: functions_1.twitchHeaders,
    });
    const followList = getFollowList.data.data;
    // Check for new streamers
    const followIds = [];
    const newIds = [];
    await followList.map((streamer) => {
        followIds.push(streamer.to_id);
        if (!currentFollowListIds.includes(streamer.to_id))
            newIds.push(`id=${streamer.to_id}`);
    });
    // Check for unfollowed streamers
    currentFollowListIds.map(async (id) => {
        if (!followIds.includes(id))
            await twitchStreamerModel_1.default.findOneAndDelete({ id });
    });
    // Add new streamers
    if (!newIds.length) {
        res.status(200).json({ status: 'ok', message: 'Новых отслеживаемых стримеров не обнаружено!' });
        return;
    }
    const getStreamersData = await axios_1.default.get(`https://api.twitch.tv/helix/users?${newIds.join('&')}`, {
        headers: functions_1.twitchHeaders,
    });
    const streamersData = getStreamersData.data.data;
    const preparedData = [];
    await streamersData.map((streamer) => {
        preparedData.push({
            id: streamer.id,
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url,
        });
    });
    preparedData.map(async (streamer) => {
        await twitchStreamerModel_1.default.create(streamer)
            .catch((err) => console.log('Ошибка добавления стримера', err));
    });
    res.status(200).json({
        status: 'ok',
        message: 'Список стримеров успешно импортирован',
    });
});
exports.searchGame = (0, catchAsync_1.default)(async (req, res) => {
    const { gameName } = req.query;
    const response = await axios_1.default.get(`https://api.twitch.tv/helix/search/categories?query=${gameName}`, {
        headers: functions_1.twitchHeaders,
    });
    res.status(200).json({
        status: 'ok',
        data: response.data.data,
    });
});
exports.searchStreamer = (0, catchAsync_1.default)(async (req, res) => {
    const { search } = req.query;
    const response = await await axios_1.default.get(`https://api.twitch.tv/helix/search/channels?query=${search}`, {
        headers: functions_1.twitchHeaders,
    });
    res.status(200).json({
        status: 'ok',
        data: response.data.data,
    });
});
exports.resetNotificationStatus = (0, catchAsync_1.default)(async (req, res) => {
    await twitchStreamerModel_1.default.updateMany({ 'flags.notifyOnNextGame': true }, { $set: { 'flags.notifyOnNextGame': false } });
    res.status(200).json({
        status: 'ok',
        message: 'Статусы уведомлений при смене игры стримером успешно сбросаны!',
    });
});
exports.getVodsData = (0, catchAsync_1.default)(async (req, res, next) => {
    const vods = await twitchWatchlistModel_1.default.find({ duration: { $exists: false }, 'flags.isAvailable': true });
    const ids = vods.map((vod) => `id=${vod.id}`);
    if (!ids.length)
        res.status(400).json({ status: 'fail', message: 'Видео без данных отсутствуют' });
    if (ids.length) {
        await axios_1.default.get(`https://api.twitch.tv/helix/videos?${ids.join('&')}`, {
            headers: functions_1.twitchHeaders,
        })
            .then(async (resp) => {
            const items = await resp.data.data;
            await items.map(async (vod) => {
                if (!vod.thumbnail_url.includes('404_processing')) {
                    await twitchWatchlistModel_1.default.findOneAndUpdate({ id: vod.id }, {
                        $set: {
                            duration: (0, TwitchCommon_1.convertDuration)(vod.duration),
                            thumbnail: vod.thumbnail_url,
                        },
                    })
                        .catch((err) => console.log(chalk_1.default.red('[Twitch Watchlist]: Ошибка обновления информации о видео!'), err));
                }
            });
        })
            .then(() => {
            res.status(200).json({
                status: 'ok',
                message: 'Данные обновлены для доступных видео',
            });
        })
            .catch((err) => {
            console.log(chalk_1.default.red('[Twitch Watchlist]: Невозможно получить данные для удаленных видео'), err);
            return next(sendErrorDataFetch);
        });
    }
});
exports.getNotificationData = (0, catchAsync_1.default)(async (req, res) => {
    const streamers = await twitchStreamerModel_1.default.find({}, { id: 1, name: 1, avatar: 1, 'flags.notifyOnNewGame': 1 });
    const enabledForAll = streamers.every((streamer) => streamer.flags.notifyOnNewGame === true);
    const settings = await settingsModel_1.default.find();
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
exports.setNotificationParam = (0, catchAsync_1.default)(async (req, res, next) => {
    const { param, enabled, enabledForAll } = req.body;
    if (enabledForAll !== undefined) {
        await twitchStreamerModel_1.default.updateMany({}, { $set: { 'flags.notifyOnNewGame': enabledForAll } });
        res.status(200).json({
            status: 'ok',
            message: 'Статус уведомлений для всех стримеров изменён!',
        });
        return;
    }
    if (param.length !== 8) {
        const updateParam = await settingsModel_1.default.findOneAndUpdate({}, { $set: { [`notifications.${param}`]: enabled } });
        if (!updateParam)
            return next(sendErrorSettingsNotInit);
        res.status(200).json({
            status: 'ok',
            message: 'Статус уведомления для этого параметра изменён',
        });
        return;
    }
    const streamer = await twitchStreamerModel_1.default.findOneAndUpdate({ id: param }, { $set: { 'flags.notifyOnNewGame': enabled } });
    if (!streamer)
        return next(sendError404Streamer);
    res.status(200).json({
        status: 'ok',
        message: 'Статус уведомлений для этого стримера изменён',
    });
});
exports.testFunction = (0, catchAsync_1.default)(async (req, res) => {
    // const vods = await TwitchWatchlist.find({ gamesData: { $exists: false }, platform: { $ne: 'YouTube'} }).limit(50);
    // console.log(vods);
    // for (const vod of vods) {
    //     const gamesData: any = [];
    //     for (const game of vod.games) {
    //         const coverId = await getGameCover(game);
    //         const isGameFavorite = await TwitchGame.findOne({ name: game });
    //         gamesData.push({
    //             name: game,
    //             coverId,
    //             favorite: !!isGameFavorite,
    //         });
    //     };
    //     await TwitchWatchlist.findByIdAndUpdate(vod._id, { gamesData });
    //     console.log(gamesData);
    // };
    const vods = await twitchWatchlistModel_1.default.find({ avatar: { $exists: false } });
    for (const vod of vods) {
        await axios_1.default.get(`https://api.twitch.tv/helix/users?login=${vod.author}`, {
            headers: functions_1.twitchHeaders,
        })
            .then(async (data) => {
            await twitchWatchlistModel_1.default.findByIdAndUpdate(vod._id, { avatar: data.data.data[0].profile_image_url });
        })
            .catch((err) => console.log(err.data));
    }
    res.status(200).json({
        status: 'ok'
    });
});
