"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDailyReport = exports.getReports = void 0;
const functions_1 = require("../utils/functions");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const twitchReportModel_1 = __importDefault(require("../models/twitchReportModel"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const twitchStatsModel_1 = __importDefault(require("../models/twitchStatsModel"));
const TwitchStatsApp_1 = __importDefault(require("../apps/TwitchStatsApp"));
// possible errors
const sendError500 = (err) => (0, functions_1.sendError)(`Ошибка выполнения запроса! ${err}`, 500);
exports.getReports = (0, catchAsync_1.default)(async (req, res) => {
    const { limit, streamer, game } = req.query;
    // SEARCH PARAMS
    let match = {};
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
    let pipeline = [];
    if (streamer || game) {
        pipeline = [
            { $unwind: '$follows' },
            { $project: { highlights: 0 } },
            { $match: match },
            { $group: {
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
            $limit: +limit,
        },
        ...pipeline,
    ];
    const reports = await twitchReportModel_1.default.aggregate(pipeline);
    reports.map(async (report) => {
        if (!game && !streamer) {
            report.follows.map((s) => {
                const user = report.followList.filter((u) => {
                    if (u.name === s.userName)
                        return u;
                })[0];
                if (user && user.avatar)
                    s.avatar = user.avatar;
            });
        }
        else {
            report.items.map((item) => {
                const user = report.followList.filter((u) => {
                    if (u.name === item.userName)
                        return u;
                })[0];
                if (user && user.avatar)
                    item.avatar = user.avatar;
            });
        }
    });
    // QUERY TODAY REPORT
    const todayFollows = await twitchStreamerModel_1.default.find({ streamHistory: { $exists: true } }, { userName: '$name', avatar: 1, games: '$streamHistory' });
    const todayHighlights = await twitchStatsModel_1.default.find();
    const today = { highlights: todayHighlights, follows: todayFollows };
    let items = [...reports];
    if (!game && !streamer)
        items = [today, ...reports];
    const total = await twitchReportModel_1.default.countDocuments(match);
    res.status(200).json({
        status: 'success',
        data: {
            items,
            total,
        },
    });
});
exports.createDailyReport = (0, catchAsync_1.default)(async (req, res, next) => {
    await (0, TwitchStatsApp_1.default)()
        .then(() => {
        res.status(200).json({
            status: 'ok',
            message: 'Ежедневный отчёт успешно составлен',
        });
    })
        .catch((err) => next(sendError500(err)));
});
