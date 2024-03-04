import { PipelineStage } from 'mongoose';
import { sendError } from '../utils/functions';
import catchAsync from '../utils/catchAsync';
import TwitchReport, { ITwitchReport, ITwitchReportFollows } from '../models/twitchReportModel';
import TwitchStreamer, { ITwitchStreamer } from '../models/twitchStreamerModel';
import TwitchStats from '../models/twitchStatsModel';
import TwitchStatsApp from '../apps/TwitchStatsApp';
import { OperationError } from './errorController';

// possible errors
const sendError500 = (err: OperationError) => sendError(`Ошибка выполнения запроса! ${err}`, 500);

export const getReports = catchAsync(async (req, res) => {
    const { limit, streamer, game } = req.query;
    // SEARCH PARAMS
    let match: object = {};
    if (streamer && !game) {
        match = {
            $or: [{ 'highlights.userName': { $regex: `^${streamer}` } }, { 'follows.userName': { $regex: `^${streamer}` } }],
        };
    }
    if (game && !streamer) {
        match = {
            $or: [{ 'highlights.gameName': { $regex: `^${game}` } }, { 'follows.games.name': { $regex: `^${game}` } }],
        };
    }

    // QUERY
    let pipeline: PipelineStage[] = [];

    if (streamer || game) {
        pipeline = [
            { $unwind: '$follows' },
            { $project: { highlights: 0 } },
            { $match: match },
            { $group:
                {
                    _id: { timestamp: '$timestamp' },
                    items: { $push: { userName: '$follows.userName', games: '$follows.games' } },
                },
            },
            {
                $lookup: {
                    from: 'ma_twitch-streamers',
                    pipeline: [
                        { $project: { avatar: 1, name: 1 } },
                    ],
                    as: 'followList',
                },
            },
            { $addFields: { timestamp: '$_id.timestamp' } },
            { $sort: { timestamp: -1 } },
        ];
    }

    pipeline = [
        {
            $match: match,
        },
        {
            $lookup: {
                from: 'ma_twitch-streamers',
                pipeline: [
                    { $project: { avatar: 1, name: 1 } },
                ],
                as: 'followList',
            },
        },
        {
            $sort: { timestamp: -1 },
        },
        {
            $limit: +limit!,
        },
        ...pipeline,
    ];
    const reports = await TwitchReport.aggregate(pipeline);

    reports.map(async (report: ITwitchReport) => {
        if (!game && !streamer) {
            report.follows.map((s: ITwitchReportFollows) => {
                const user = report.followList.filter((u: ITwitchStreamer) => {
                    if (u.name === s.userName) return u;
                })[0];
                if (user && user.avatar) s.avatar = user.avatar;
            });
        } else {
            report.items.map((item: ITwitchReportFollows) => {
                const user = report.followList.filter((u: ITwitchStreamer) => {
                    if (u.name === item.userName) return u;
                })[0];
                if (user && user.avatar) item.avatar = user.avatar;
            });
        }
    });

    // QUERY TODAY REPORT
    const todayFollows = await TwitchStreamer.find({ streamHistory: { $exists: true } }, { userName: '$name', avatar: 1, games: '$streamHistory' });
    const todayHighlights = await TwitchStats.find();
    const today = { highlights: todayHighlights, follows: todayFollows };
    let items = [...reports];
    if (!game && !streamer) items = [today, ...reports];

    const total = await TwitchReport.countDocuments(match);

    res.status(200).json({
        status: 'success',
        data: {
            items,
            total,
        },
    });
});

export const createDailyReport = catchAsync(async (req, res, next) => {
    await TwitchStatsApp()
    .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Ежедневный отчёт успешно составлен',
        });
    })
    .catch((err: OperationError) => next(sendError500(err)));
});
