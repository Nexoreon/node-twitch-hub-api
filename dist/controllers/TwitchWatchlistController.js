"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkVideosAvailability = exports.moveSuggestion = exports.deleteVideo = exports.updateVideo = exports.addVideo = exports.getVideo = exports.getParts = exports.getSuggestions = exports.getVideos = void 0;
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
const TwitchCommon_1 = require("../apps/TwitchCommon");
const twitchWatchlistModel_1 = __importDefault(require("../models/twitchWatchlistModel"));
// possible errors
const sendError404 = (0, functions_1.sendError)('Такого видео не существует!', 404);
const sendErrorParamRelated = (0, functions_1.sendError)('Не указан ID родительского видео!', 400);
const sendErrorAddVideo = (0, functions_1.sendError)('Ошибка добавления видео!', 500);
const sendErrorPlatform = (0, functions_1.sendError)('Неопознанная платформа. Поддерживается только Twitch и YouTube', 400);
const sendErrorDuplicate = (0, functions_1.sendError)('Такое видео уже было добавлено ранее!', 409);
const suggestionsQuery = { 'flags.isSuggestion': true, relatedTo: { $exists: false } };
exports.getVideos = (0, catchAsync_1.default)(async (req, res) => {
    const { suggestionsLimit } = req.query;
    const videos = await twitchWatchlistModel_1.default.aggregate([
        { $match: { 'flags.isSuggestion': false, 'flags.watchLater': false } },
        { $lookup: {
                from: 'ma_twitch-watchlists',
                localField: '_id',
                foreignField: 'relatedTo',
                as: 'parts',
            } },
        { $sort: { priority: -1 } },
    ]);
    const mnTotal = videos.length;
    const watchLater = await twitchWatchlistModel_1.default.aggregate([
        { $match: { 'flags.isSuggestion': false, 'flags.watchLater': true } },
        { $lookup: {
                from: 'ma_twitch-watchlists',
                localField: '_id',
                foreignField: 'relatedTo',
                as: 'parts',
            } },
        { $sort: { priority: -1 } },
    ]);
    const watchLaterTotal = await twitchWatchlistModel_1.default.countDocuments({ 'flags.watchLater': true });
    const suggestions = await twitchWatchlistModel_1.default.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
                from: 'ma_twitch-watchlists',
                localField: '_id',
                foreignField: 'relatedTo',
                as: 'parts',
            } },
        { $sort: { sortDate: -1 } },
        { $limit: +suggestionsLimit },
    ]);
    const sgTotal = await twitchWatchlistModel_1.default.countDocuments(suggestionsQuery);
    res.status(200).json({
        status: 'ok',
        data: {
            main: {
                items: videos,
                total: mnTotal,
            },
            watchLater: {
                items: watchLater,
                total: watchLaterTotal,
            },
            suggestions: {
                items: suggestions,
                total: sgTotal,
            },
        },
    });
});
exports.getSuggestions = (0, catchAsync_1.default)(async (req, res) => {
    const { limit } = req.query;
    const suggestions = await twitchWatchlistModel_1.default.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
                from: 'ma_twitch-watchlists',
                localField: '_id',
                foreignField: 'relatedTo',
                as: 'parts',
            } },
        { $sort: { sortDate: -1 } },
        { $limit: +limit },
    ]);
    const total = await twitchWatchlistModel_1.default.countDocuments(suggestionsQuery);
    res.status(200).json({
        status: 'ok',
        data: {
            suggestions: {
                items: suggestions,
                total,
            },
        },
    });
});
exports.getParts = (0, catchAsync_1.default)(async (req, res, next) => {
    const { relatedTo } = req.query;
    if (!relatedTo)
        return next(sendErrorParamRelated);
    const parts = await twitchWatchlistModel_1.default.find({ relatedTo });
    res.status(200).json({
        status: 'ok',
        data: {
            total: parts.length,
            items: parts,
        },
    });
});
exports.getVideo = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const vod = await twitchWatchlistModel_1.default.findById(id);
    if (!vod)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: vod,
    });
});
exports.addVideo = (0, catchAsync_1.default)(async (req, res, next) => {
    const { url } = req.body;
    let splitedUrl = url.split('/');
    let videoId = splitedUrl[splitedUrl.length - 1];
    if (url.includes('youtube')) {
        splitedUrl = url.split('=');
        // eslint-disable-next-line prefer-destructuring
        videoId = splitedUrl[1];
        await axios_1.default.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.YOUTUBE_API_KEY}&id=${videoId}&part=snippet,contentDetails`)
            .then(async (resp) => {
            const video = resp.data.items[0];
            const vidInfo = video.snippet;
            const duration = video.contentDetails.duration.replace('PT', '').replace('H', ':').replace('M', ':').replace('S', '');
            req.body = {
                ...req.body,
                id: videoId,
                platform: 'YouTube',
                title: vidInfo.title,
                author: vidInfo.channelTitle,
                thumbnail: vidInfo.thumbnails.medium.url,
                meta: {
                    streamDate: Date.now(),
                    followers: 0,
                },
                duration,
            };
        });
    }
    else if (url.includes('twitch.tv')) {
        await axios_1.default.get(`https://api.twitch.tv/helix/videos?id=${videoId}`, {
            headers: functions_1.twitchHeaders,
        })
            .then(async (resp) => {
            const vidInfo = resp.data.data[0];
            const duration = (0, TwitchCommon_1.convertDuration)(vidInfo.duration);
            const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');
            req.body = {
                ...req.body,
                id: videoId,
                platform: 'Twitch',
                title: vidInfo.title,
                author: vidInfo.user_name,
                ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url }),
            };
            await axios_1.default.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${vidInfo.user_id}`, {
                headers: functions_1.twitchHeaders,
            })
                .then((user) => {
                req.body = {
                    ...req.body,
                    meta: {
                        streamDate: vidInfo.created_at,
                        followers: user.data.total,
                    },
                };
            });
        })
            .catch((err) => {
            console.log(chalk_1.default.red('[Twitch Watchlist]: Ошибка получения видео!'), err);
            return next((0, functions_1.sendError)(`Ошибка получения видео: ${err.code}`, 500));
        });
    }
    else {
        return next(sendErrorPlatform);
    }
    await twitchWatchlistModel_1.default.create(req.body)
        .then((vod) => {
        res.status(201).json({
            status: 'ok',
            message: 'Видео успешно добавлено в список!',
            data: vod,
        });
    })
        .catch((err) => {
        if (err.code && err.code === 11000)
            return next(sendErrorDuplicate);
        return next((0, functions_1.sendError)(`Ошибка добавления видео! ${err.message}`, 500));
    });
});
exports.updateVideo = (0, catchAsync_1.default)(async (req, res, next) => {
    const { flags, ...body } = req.body;
    const updatedVideo = await twitchWatchlistModel_1.default.findByIdAndUpdate(req.params.id, {
        ...body,
        $set: {
            'flags.isShortTerm': flags.isShortTerm,
            'flags.watchLater': flags.watchLater,
        },
    });
    if (!updatedVideo)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: updatedVideo,
    });
});
exports.deleteVideo = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const findChildren = await twitchWatchlistModel_1.default.find({ relatedTo: id });
    if (findChildren.length)
        await twitchWatchlistModel_1.default.deleteMany({ relatedTo: id });
    const vod = await twitchWatchlistModel_1.default.findByIdAndDelete({ _id: id });
    if (!vod)
        return next(sendError404);
    res.status(204).json({
        status: 'ok',
        message: 'Видео было успешно удалено из списка просмотра',
    });
});
exports.moveSuggestion = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id, priority, watchLater, notes } = req.body;
    await axios_1.default.get(`https://api.twitch.tv/helix/videos?id=${id}`, {
        headers: functions_1.twitchHeaders,
    })
        .then(async (resp) => {
        const vidInfo = resp.data.data[0];
        const duration = (0, TwitchCommon_1.convertDuration)(vidInfo.duration);
        const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');
        req.body = {
            priority,
            notes,
            ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url }),
        };
    })
        .catch((err) => {
        console.log(chalk_1.default.red('[Twitch Watchlist]: Ошибка получения информации о видео'), err);
        return next(sendErrorAddVideo);
    });
    await twitchWatchlistModel_1.default.findOneAndUpdate({ id }, {
        ...req.body,
        $set: { 'flags.isSuggestion': false, 'flags.watchLater': watchLater || false },
    });
    res.status(200).json({
        status: 'ok',
        data: { message: 'Видео успешно перенесено в список просмотра' },
    });
});
exports.checkVideosAvailability = (0, catchAsync_1.default)(async (req, res) => {
    const list = await twitchWatchlistModel_1.default.find({ platform: 'Twitch', 'flags.isAvailable': { $ne: false } });
    const currentIds = list.map((vid) => vid.id);
    const deletedVideos = [];
    const idParts = [];
    let message = '';
    const handleTwitchRequest = async (ids) => {
        try {
            console.log(`Received request with amount of ${ids.length} videos`);
            const resp = await axios_1.default.get(`https://api.twitch.tv/helix/videos?id=${ids.join('&id=')}`, {
                headers: functions_1.twitchHeaders,
            });
            const existingIds = resp.data.data.map((vid) => vid.id);
            console.log(`Videos alive amount: ${resp.data.data.length}`);
            const updatePromises = ids.map(async (id) => {
                const video = list.find((vid) => vid.id === id);
                const videoNotAvailable = !existingIds.includes(id);
                if (videoNotAvailable && video) {
                    deletedVideos.push(`\n ${video.games[0]} от ${video.author} \n`);
                    await twitchWatchlistModel_1.default.findOneAndUpdate({ id }, { $set: { 'flags.isAvailable': false } });
                }
            });
            await Promise.all(updatePromises);
        }
        catch (err) {
            console.log(chalk_1.default.red('[Twitch Watchlist]: Error! Unable to check videos availability!'), err);
            message = `Во время проверки произошла ошибка: ${err.message}`;
        }
    };
    if (currentIds.length > 100) { // check twitch request limit
        for (let i = 0; i < currentIds.length; i += 100) {
            idParts.push(currentIds.slice(i, i + 100));
        }
        await Promise.all(idParts.map((part) => handleTwitchRequest(part)));
    }
    else {
        await handleTwitchRequest(currentIds);
    }
    console.log(`Deleted videos amount: ${deletedVideos.length}`);
    if (!message) {
        message = deletedVideos.length
            ? `Следующие видео больше недоступны так как были удалены с платформы: ${deletedVideos.join(', ')}`
            : 'Все актуальные видео доступны для просмотра';
    }
    res.status(200).json({
        status: 'ok',
        data: {
            message,
        },
    });
});
