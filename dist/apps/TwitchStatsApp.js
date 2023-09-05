"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
const cli_table_1 = __importDefault(require("cli-table"));
const twitchStatsModel_1 = __importDefault(require("../models/twitchStatsModel"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const twitchReportModel_1 = __importDefault(require("../models/twitchReportModel"));
const twitchGameModel_1 = __importDefault(require("../models/twitchGameModel"));
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const TwitchCommon_1 = require("./TwitchCommon");
const functions_1 = require("../utils/functions");
const commands_1 = require("../modules/TelegramBot/commands");
exports.default = async () => {
    console.log(chalk_1.default.greenBright('[Twitch Stats]: Запуск составления ежедневного отчёта по стримам...'));
    const settings = await settingsModel_1.default.find();
    try {
        // Preparation. Fetch data from DB
        const stats = await twitchStatsModel_1.default.find();
        const games = await twitchGameModel_1.default.find();
        const gamesIDs = games.map((game) => game.id); // extract ids from games db
        const followsHistory = await twitchStreamerModel_1.default.find({ streamHistory: { $exists: 1 } }, { streamHistory: 1, name: 1, _id: 0 });
        if (!stats.length && !followsHistory.length) {
            return console.log(chalk_1.default.greenBright('[Twitch Stats]: Нету стримов для показа! Таблица сгенерирована не будет'));
        }
        const tableArray = [];
        const table = new cli_table_1.default({
            head: ['Min. viewers', 'Total viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 10, 35, 25, 25],
        });
        // Handle fetched data
        const statsArray = [];
        stats.map((stream) => {
            const findIndex = gamesIDs.indexOf(stream.gameId);
            const minViewers = games[findIndex].search.minViewers || 2000;
            tableArray.push([minViewers.toString(), stream.viewers.toString(), stream.gameName, stream.userName, stream.title]);
            statsArray.push({
                userId: stream.userId,
                userName: stream.userName,
                gameId: stream.gameId,
                gameName: stream.gameName,
                viewers: stream.viewers,
                timestamp: stream.date,
            });
        });
        const followsHistoryArray = [];
        followsHistory.map(({ streamHistory, name }) => followsHistoryArray.push({ userName: name, games: streamHistory })); // TODO: ADD INTERFACE
        console.log(chalk_1.default.greenBright('[Twitch Stats]: Ежедневный отчёт о стримах готов! Добавление отчёта в датабазу...'));
        // Create report
        await twitchReportModel_1.default.create({
            timestamp: Date.now(),
            highlights: statsArray,
            follows: followsHistoryArray,
        })
            .then(() => console.log(chalk_1.default.greenBright('[Twitch Stats]: Отчёт был добавлен в датабазу. Вывод таблицы и отсылка уведомления...')))
            .catch((err) => console.log(chalk_1.default.red('[Twitch Stats]: Ошибка отправки отчёта в датабазу!'), err));
        table.push(...tableArray);
        // Create and send notification
        (0, functions_1.createNotification)({
            sendOut: Date.now(),
            receivers: [process.env.USER_ID],
            title: 'Отчёт о стримах готов',
            content: 'Ежедневный отчёт о стримах за день готов',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub',
            image: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
        });
        (0, TwitchCommon_1.sendNotification)({
            title: 'Отчёт о стримах готов',
            message: 'Ежедневный отчёт о стримах за день готов',
            icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub',
        }, { push: settings[0].notifications.reports.push });
        if (settings[0].notifications.reports.telegram)
            (0, commands_1.handleGetReport)(+process.env.TELEGRAM_MY_ID);
        // Delete temporal data and show generated table
        await twitchStreamerModel_1.default.updateMany({ streamHistory: { $exists: 1 } }, { $unset: { streamHistory: 1 } });
        await twitchStatsModel_1.default.deleteMany();
        console.log(table.toString());
    }
    catch (err) {
        console.log(chalk_1.default.red('[Twitch Stats]: Произошла ошибка составления отчёта! Отмена операции.'), err);
    }
};
