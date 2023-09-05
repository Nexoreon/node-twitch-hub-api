"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStreamersActivity = exports.notifyOnNextGame = exports.deleteStreamer = exports.updateStreamer = exports.createStreamer = exports.getStreamer = exports.getStreamers = void 0;
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const toad_scheduler_1 = require("toad-scheduler");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const TwitchStreamersApp_1 = __importDefault(require("../apps/TwitchStreamersApp"));
const TwitchCommon_1 = require("../apps/TwitchCommon");
// possible errors
const sendError404 = (0, functions_1.sendError)('Такого стримера не найдено в датабазе!', 404);
const sendError500 = (0, functions_1.sendError)('Ошибка выполнения запроса!', 500);
const sendErrorMissingId = (0, functions_1.sendError)('Необходимо указать ID стримера!', 400);
const scheduler = new toad_scheduler_1.ToadScheduler();
exports.getStreamers = (0, catchAsync_1.default)(async (req, res) => {
    const streamers = await twitchStreamerModel_1.default.find().sort({ name: -1 });
    const ids = streamers.map((streamer) => `user_id=${streamer.id}`);
    const response = await axios_1.default.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            Authorization: process.env.TWITCH_TOKEN,
        },
    });
    const streamersData = [...streamers];
    const liveIDs = await response.data.data.map((streamer) => ({ id: streamer.user_id, game: streamer.game_name }));
    streamersData.map((oldStreamer) => {
        let liveContent;
        liveIDs.find((v, index) => {
            if (v.id === oldStreamer.id)
                liveContent = liveIDs[index];
        });
        oldStreamer._doc = {
            ...oldStreamer._doc,
            live: false,
            ...(liveContent && { live: true, game: liveContent.game }),
        };
    });
    res.status(200).json({
        status: 'ok',
        data: streamersData,
    });
});
exports.getStreamer = (0, catchAsync_1.default)(async (req, res, next) => {
    const streamer = await twitchStreamerModel_1.default.findById(req.params.id);
    if (!streamer)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: streamer,
    });
});
exports.createStreamer = (0, catchAsync_1.default)(async (req, res) => {
    const newStreamer = await twitchStreamerModel_1.default.create(req.body);
    res.status(201).json({
        status: 'ok',
        data: newStreamer,
    });
});
exports.updateStreamer = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    const { twitchId } = req.query;
    let freshData;
    if (twitchId) {
        freshData = await axios_1.default.get(`https://api.twitch.tv/helix/users?id=${twitchId}`, {
            headers: {
                'client-id': process.env.TWITCH_CLIENT,
                Authorization: process.env.TWITCH_TOKEN,
            },
        });
        const data = freshData.data.data[0];
        req.body = {
            ...req.body,
            login: data.login,
            name: data.display_name,
            avatar: data.profile_image_url,
        };
    }
    const streamer = await twitchStreamerModel_1.default.findByIdAndUpdate(id, req.body, {
        new: true,
    });
    if (!streamer)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: streamer,
    });
});
exports.deleteStreamer = (0, catchAsync_1.default)(async (req, res, next) => {
    const streamer = await twitchStreamerModel_1.default.findByIdAndDelete(req.params.id);
    if (!streamer)
        return next(sendError404);
    res.status(204).json({
        status: 'ok',
        message: 'Стример успешно удалён',
    });
});
// Other
exports.notifyOnNextGame = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id, duration } = req.query;
    const { game } = req.body;
    if (!id)
        return next(sendErrorMissingId);
    await twitchStreamerModel_1.default.findOneAndUpdate({ id }, {
        $set: {
            gameName: game,
            'flags.notifyOnNextGame': true,
        },
    });
    scheduler.removeById('checkActiveGame'); // remove job with this id if exists to avoid conflict
    const task = new toad_scheduler_1.Task('checkActiveGame', () => {
        (0, TwitchCommon_1.checkActiveGame)(id, () => scheduler.removeById('checkActiveGame'), duration === 'everyGame');
    });
    const scheduledTask = new toad_scheduler_1.SimpleIntervalJob({
        minutes: 5,
    }, task, {
        id: 'checkActiveGame',
    });
    scheduler.addSimpleIntervalJob(scheduledTask);
    res.status(200).json({
        status: 'ok',
        message: 'Вы будете оповещены когда стример начнёт играть в следующую игру',
    });
});
exports.checkStreamersActivity = (0, catchAsync_1.default)(async (req, res, next) => {
    await (0, TwitchStreamersApp_1.default)()
        .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Проверка активности успешно завершена!',
        });
    })
        .catch((err) => {
        console.log(chalk_1.default.red('[Twitch Streamers]: Ошибка проверки активности стримеров!'), err);
        next(sendError500);
    });
});
