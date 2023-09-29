/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import catchAsync from '../utils/catchAsync';
import { sendError } from '../utils/functions';
import { twitchHeaders, convertDuration } from '../apps/TwitchCommon';
import TwitchWatchlist, { ITwitchWatchlist } from '../models/twitchWatchlistModel';
import { IResponseVod } from '../types/types';
import { IMongoDBError, OperationError } from './errorController';

// possible errors
const sendError404 = sendError('Такого видео не существует!', 404);
const sendErrorParamRelated = sendError('Не указан ID родительского видео!', 400);
const sendErrorAddVideo = sendError('Ошибка добавления видео!', 500);
const sendErrorPlatform = sendError('Неопознанная платформа. Поддерживается только Twitch и YouTube', 400);
const sendErrorDuplicate = sendError('Такое видео уже было добавлено ранее!', 409);

const suggestionsQuery = { 'flags.isSuggestion': true, relatedTo: { $exists: false } };

export const getVideos = catchAsync(async (req, res) => {
    const { suggestionsLimit } = req.query;
    const videos = await TwitchWatchlist.aggregate([
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

    const watchLater = await TwitchWatchlist.aggregate([
        { $match: { 'flags.isSuggestion': false, 'flags.watchLater': true } },
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts',
        } },
        { $sort: { priority: -1 } },
    ]);
    const watchLaterTotal = await TwitchWatchlist.countDocuments({ 'flags.watchLater': true });

    const suggestions = await TwitchWatchlist.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts',
        } },
        { $sort: { sortDate: -1 } },
        { $limit: +suggestionsLimit! },
    ]);
    const sgTotal = await TwitchWatchlist.countDocuments(suggestionsQuery);

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

export const getSuggestions = catchAsync(async (req, res) => {
    const { limit } = req.query;
    const suggestions = await TwitchWatchlist.aggregate([
        { $match: suggestionsQuery },
        { $lookup: {
            from: 'ma_twitch-watchlists',
            localField: '_id',
            foreignField: 'relatedTo',
            as: 'parts',
        } },
        { $sort: { sortDate: -1 } },
        { $limit: +limit! },
    ]);
    const total = await TwitchWatchlist.countDocuments(suggestionsQuery);

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

export const getParts = catchAsync(async (req, res, next) => {
    const { relatedTo } = req.query;
    if (!relatedTo) return next(sendErrorParamRelated);
    const parts = await TwitchWatchlist.find({ relatedTo });

    res.status(200).json({
        status: 'ok',
        data: {
            total: parts.length,
            items: parts,
        },
    });
});

export const getVideo = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const vod = await TwitchWatchlist.findById(id);
    if (!vod) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: vod,
    });
});

export const addVideo = catchAsync(async (req, res, next) => {
    const { url } = req.body;
    let splitedUrl: string = url.split('/');
    let videoId: string = splitedUrl[splitedUrl.length - 1];

    if (url.includes('youtube')) {
        splitedUrl = url.split('=');
        // eslint-disable-next-line prefer-destructuring
        videoId = splitedUrl[1];
        await axios.get(`https://www.googleapis.com/youtube/v3/videos?key=${process.env.YOUTUBE_API_KEY}&id=${videoId}&part=snippet,contentDetails`)
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
    } else if (url.includes('twitch.tv')) {
        await axios.get(`https://api.twitch.tv/helix/videos?id=${videoId}`, { // get video info
            headers: twitchHeaders,
        })
        .then(async (resp) => {
            const vidInfo = resp.data.data[0];
            const duration = convertDuration(vidInfo.duration);
            const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');

            req.body = {
                ...req.body,
                id: videoId,
                platform: 'Twitch',
                title: vidInfo.title,
                author: vidInfo.user_name,
                ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url }),
            };

            await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${vidInfo.user_id}`, {
                headers: twitchHeaders,
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
        .catch((err: OperationError) => {
            console.log(chalk.red('[Twitch Watchlist]: Ошибка получения видео!'), err);
            return next(sendError(`Ошибка получения видео: ${err.code}`, 500));
        });
    } else {
        return next(sendErrorPlatform);
    }

    await TwitchWatchlist.create(req.body)
    .then((vod: ITwitchWatchlist) => {
        res.status(201).json({
            status: 'ok',
            message: 'Видео успешно добавлено в список!',
            data: vod,
        });
    })
    .catch((err: IMongoDBError) => {
        if (err.code && err.code === 11000) return next(sendErrorDuplicate);
        return next(sendError(`Ошибка добавления видео! ${err.message}`, 500));
    });
});

export const updateVideo = catchAsync(async (req, res, next) => {
    const { flags, ...body } = req.body;
    const updatedVideo = await TwitchWatchlist.findByIdAndUpdate(req.params.id, {
        ...body,
        $set: {
            'flags.isShortTerm': flags.isShortTerm,
            'flags.watchLater': flags.watchLater,
        },
    });
    if (!updatedVideo) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: updatedVideo,
    });
});

export const deleteVideo = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const findChildren = await TwitchWatchlist.find({ relatedTo: id });
    if (findChildren.length) await TwitchWatchlist.deleteMany({ relatedTo: id });

    const vod = await TwitchWatchlist.findByIdAndDelete({ _id: id });
    if (!vod) return next(sendError404);

    res.status(204).json({
        status: 'ok',
        message: 'Видео было успешно удалено из списка просмотра',
    });
});

export const moveSuggestion = catchAsync(async (req, res, next) => {
    const { id, priority, watchLater, notes } = req.body;
    await axios.get(`https://api.twitch.tv/helix/videos?id=${id}`, { // get video info
        headers: twitchHeaders,
    })
    .then(async (resp) => {
        const vidInfo = resp.data.data[0];
        const duration = convertDuration(vidInfo.duration);
        const isLiveVod = vidInfo.thumbnail_url.includes('404_processing');

        req.body = {
            priority,
            notes,
            ...(!isLiveVod && { duration, thumbnail: vidInfo.thumbnail_url }),
        };
    })
    .catch((err: OperationError) => {
        console.log(chalk.red('[Twitch Watchlist]: Ошибка получения информации о видео'), err);
        return next(sendErrorAddVideo);
    });

    await TwitchWatchlist.findOneAndUpdate({ id }, {
        ...req.body,
        $set: { 'flags.isSuggestion': false, 'flags.watchLater': watchLater || false },
    });

    res.status(200).json({
        status: 'ok',
        data: { message: 'Видео успешно перенесено в список просмотра' },
    });
});

export const checkVideosAvailability = catchAsync(async (req, res) => {
    const list = await TwitchWatchlist.find({ platform: 'Twitch', 'flags.isAvailable': { $ne: false } });
    const currentIds = list.map((vid: ITwitchWatchlist) => vid.id);
    const deletedVideos: string[] = [];

    await axios.get(`https://api.twitch.tv/helix/videos?id=${currentIds.join(',')}`, {
        headers: twitchHeaders,
    })
    .then((resp) => {
        let hasDeletedVideos = false;
        const existingIds = resp.data.data.map((vid: IResponseVod) => vid.id);
        currentIds.map(async (id: string) => {
            const video = list.filter((vid: ITwitchWatchlist) => vid.id === id)[0];
            const videoNotAvailable = !existingIds.includes(id);
            if (videoNotAvailable) {
                hasDeletedVideos = true;
                deletedVideos.push(`${video.games[0]} от ${video.author}`);
                await TwitchWatchlist.findOneAndUpdate({ id }, { $set: { 'flags.isAvailable': false } });
            }
        });

        const message = hasDeletedVideos
            ? `Следующие видео больше недоступны так как были удалены с платформы: ${deletedVideos.join(', ')}`
            : 'Все актуальные видео доступны для просмотра';

        res.status(200).json({
            status: 'ok',
            data: {
                message,
            },
        });
    });
});
