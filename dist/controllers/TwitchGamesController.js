"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkGamesActivity = exports.addGameHistory = exports.deleteGame = exports.updateGame = exports.getGame = exports.getAllGames = exports.createGame = exports.addGame = void 0;
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const twitchGameModel_1 = __importDefault(require("../models/twitchGameModel"));
const twitchReportModel_1 = __importDefault(require("../models/twitchReportModel"));
const TwitchGamesApp_1 = __importDefault(require("../apps/TwitchGamesApp"));
const functions_1 = require("../utils/functions");
// possible errors
const sendError404 = (0, functions_1.sendError)('Такой игры не найдено в датабазе!', 404);
const sendError500 = (err) => (0, functions_1.sendError)(`Ошибка выполнения запроса! ${err}`, 500);
exports.addGame = (0, catchAsync_1.default)(async (req, res, next) => {
    await axios_1.default.get(`https://api.twitch.tv/helix/games?game_id=${req.body.gameId}`, {
        headers: {
            Authorization: process.env.TWITCH_TOKEN,
            'client-id': process.env.TWITCH_CLIENT,
        },
    })
        .then(async (data) => {
        const game = data.data.data;
        const newGame = await twitchGameModel_1.default.create({
            boxArt: game.box_art_url,
            id: game.id,
            name: game.name,
            search: {
                isSearchable: req.body.isSearchable || true,
                minViewers: req.body.minViewers || 2000,
            },
        });
        res.status(201).json({
            status: 'ok',
            data: newGame,
        });
    })
        .catch((err) => {
        console.log(chalk_1.default.red('[Twitch Games]: Ошибка получения игры!'), err);
        next(sendError500(err));
    });
});
exports.createGame = (0, catchAsync_1.default)(async (req, res) => {
    const newGame = await twitchGameModel_1.default.create({
        boxArt: req.body.box_art_url,
        name: req.body.name,
        id: req.body.id,
        search: { ...req.body.search },
    });
    res.status(201).json({
        status: 'success',
        data: newGame,
    });
});
exports.getAllGames = (0, catchAsync_1.default)(async (req, res) => {
    const { limit } = req.query;
    const items = await twitchGameModel_1.default.find().sort({ addedAt: -1 }).limit(limit && +limit || 10);
    const total = await twitchGameModel_1.default.countDocuments();
    res.status(200).json({
        status: 'success',
        data: { items, total },
    });
});
exports.getGame = (0, catchAsync_1.default)(async (req, res, next) => {
    const game = await twitchGameModel_1.default.findById(req.params.id);
    if (!game)
        return next(sendError404);
    res.status(200).json({
        status: 'success',
        data: game,
    });
});
exports.updateGame = (0, catchAsync_1.default)(async (req, res, next) => {
    const game = await twitchGameModel_1.default.findByIdAndUpdate(req.params.id, {
        $set: req.body,
    }, { new: true });
    if (!game)
        return next(sendError404);
    res.status(200).json({
        status: 'success',
        data: game,
    });
});
exports.deleteGame = (0, catchAsync_1.default)(async (req, res, next) => {
    const game = await twitchGameModel_1.default.findByIdAndDelete(req.params.id);
    if (!game)
        return next(sendError404);
    await twitchReportModel_1.default.findOneAndDelete({ gameId: game.id });
    res.status(204).json({
        status: 'success',
        message: 'Игра успешно удалена',
    });
});
exports.addGameHistory = (0, catchAsync_1.default)(async (req, res, next) => {
    const game = await twitchGameModel_1.default.findOneAndUpdate({ id: req.body.game_id }, {
        $push: {
            history: {
                streamer_id: req.body.user_id,
                streamer: req.body.user_login,
                day: new Date().getDate(),
                month: new Date().getMonth() + 1,
                year: new Date().getFullYear(),
                timestamp: Date.now(),
            },
        },
    }, { new: true });
    if (!game)
        return next(sendError404);
    res.status(200).json({
        status: 'success',
        data: game,
    });
});
exports.checkGamesActivity = (0, catchAsync_1.default)(async (req, res, next) => {
    await (0, TwitchGamesApp_1.default)()
        .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Проверка активности игр завершена',
        });
    })
        .catch((err) => next(sendError500(err)));
});
