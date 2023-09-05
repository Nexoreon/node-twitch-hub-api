/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import catchAsync from '../utils/catchAsync';

import TwitchGame from '../models/twitchGameModel';
import TwitchReport from '../models/twitchReportModel';
import TwitchGamesApp from '../apps/TwitchGamesApp';
import { IResponseGame } from '../types/types';
import { sendError } from '../utils/functions';
import { IError } from './errorController';

// possible errors
const sendError404 = sendError('Такой игры не найдено в датабазе!', 404);
const sendError500 = (err: IError) => sendError(`Ошибка выполнения запроса! ${err}`, 500);

export const addGame = catchAsync(async (req, res, next) => {
    await axios.get(`https://api.twitch.tv/helix/games?game_id=${req.body.gameId}`, {
        headers: {
            Authorization: process.env.TWITCH_TOKEN,
            'client-id': process.env.TWITCH_CLIENT,
        },
    })
    .then(async (data: { data: { data: IResponseGame } }) => {
        const game = data.data.data;
        const newGame = await TwitchGame.create({
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
    .catch((err: IError) => {
        console.log(chalk.red('[Twitch Games]: Ошибка получения игры!'), err);
        next(sendError500(err));
    });
});

export const createGame = catchAsync(async (req, res) => {
    const newGame = await TwitchGame.create({
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

export const getAllGames = catchAsync(async (req, res) => {
    const { limit } = req.query;
    const items = await TwitchGame.find().sort({ addedAt: -1 }).limit(limit && +limit || 10);
    const total = await TwitchGame.countDocuments();

    res.status(200).json({
        status: 'success',
        data: { items, total },
    });
});

export const getGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findById(req.params.id);
    if (!game) return next(sendError404);

    res.status(200).json({
        status: 'success',
        data: game,
    });
});

export const updateGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndUpdate(req.params.id, {
        $set: req.body,
    }, { new: true });
    if (!game) return next(sendError404);

    res.status(200).json({
        status: 'success',
        data: game,
    });
});

export const deleteGame = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findByIdAndDelete(req.params.id);
    if (!game) return next(sendError404);

    await TwitchReport.findOneAndDelete({ gameId: game.id });

    res.status(204).json({
        status: 'success',
        message: 'Игра успешно удалена',
    });
});

export const addGameHistory = catchAsync(async (req, res, next) => {
    const game = await TwitchGame.findOneAndUpdate({ id: req.body.game_id }, {
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
    if (!game) return next(sendError404);

    res.status(200).json({
        status: 'success',
        data: game,
    });
});

export const checkGamesActivity = catchAsync(async (req, res, next) => {
    await TwitchGamesApp()
    .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Проверка активности игр завершена',
        });
    })
    .catch((err: IError) => next(sendError500(err)));
});
