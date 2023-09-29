/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';
import catchAsync from '../utils/catchAsync';
import { sendError } from '../utils/functions';
import TwitchStreamer, { ITwitchStreamer } from '../models/twitchStreamerModel';
import TwitchStreamersApp from '../apps/TwitchStreamersApp';
import { checkActiveGame } from '../apps/TwitchCommon';
import { IResponseStreamer } from '../types/types';
import { OperationError } from './errorController';

// possible errors
const sendError404 = sendError('Такого стримера не найдено в датабазе!', 404);
const sendError500 = sendError('Ошибка выполнения запроса!', 500);
const sendErrorMissingId = sendError('Необходимо указать ID стримера!', 400);

const scheduler = new ToadScheduler();
export const getStreamers = catchAsync(async (req, res) => {
    const streamers = await TwitchStreamer.find().sort({ name: -1 });

    const ids = streamers.map((streamer: ITwitchStreamer) => `user_id=${streamer.id}`);
    const response = await axios.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, {
        headers: {
            'client-id': process.env.TWITCH_CLIENT,
            Authorization: process.env.TWITCH_TOKEN,
        },
    });

    const streamersData = [...streamers];
    const liveIDs = await response.data.data.map((streamer: IResponseStreamer) => ({ id: streamer.user_id, game: streamer.game_name }));
    streamersData.map((oldStreamer: ITwitchStreamer) => {
        let liveContent: { id: string, game: string } | undefined;
        liveIDs.find((v: IResponseStreamer, index: number) => {
            if (v.id === oldStreamer.id) liveContent = liveIDs[index];
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

export const getStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findById(req.params.id);
    if (!streamer) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: streamer,
    });
});

export const createStreamer = catchAsync(async (req, res) => {
    const newStreamer = await TwitchStreamer.create(req.body);

    res.status(201).json({
        status: 'ok',
        data: newStreamer,
    });
});

export const updateStreamer = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { twitchId } = req.query;

    let freshData;
    if (twitchId) {
        freshData = await axios.get(`https://api.twitch.tv/helix/users?id=${twitchId}`, {
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

    const streamer = await TwitchStreamer.findByIdAndUpdate(id, req.body, {
        new: true,
    });

    if (!streamer) return next(sendError404);

    res.status(200).json({
        status: 'ok',
        data: streamer,
    });
});

export const deleteStreamer = catchAsync(async (req, res, next) => {
    const streamer = await TwitchStreamer.findByIdAndDelete(req.params.id);
    if (!streamer) return next(sendError404);

    res.status(204).json({
        status: 'ok',
        message: 'Стример успешно удалён',
    });
});

// Other

export const notifyOnNextGame = catchAsync(async (req, res, next) => {
    const { id, duration } = req.query;
    const { game } = req.body;
    if (!id) return next(sendErrorMissingId);

    await TwitchStreamer.findOneAndUpdate({ id }, {
        $set: { // allows to re-add task if server been restarted
            gameName: game,
            'flags.notifyOnNextGame': true,
        },
    });

    scheduler.removeById('checkActiveGame'); // remove job with this id if exists to avoid conflict
    const task = new Task('checkActiveGame', () => {
        checkActiveGame(id as string, () => scheduler.removeById('checkActiveGame'), duration === 'everyGame');
    });

    const scheduledTask = new SimpleIntervalJob({ // execute task every 5 minutes
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

export const checkStreamersActivity = catchAsync(async (req, res, next) => {
    await TwitchStreamersApp()
    .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Проверка активности успешно завершена!',
        });
    })
    .catch((err: OperationError) => {
        console.log(chalk.red('[Twitch Streamers]: Ошибка проверки активности стримеров!'), err);
        next(sendError500);
    });
});
