"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const toad_scheduler_1 = require("toad-scheduler");
const node_schedule_1 = __importDefault(require("node-schedule"));
const axios_1 = __importDefault(require("axios"));
const settingsModel_1 = __importDefault(require("../../models/settingsModel"));
// Imported tasks
const TwitchStreamersApp_1 = __importDefault(require("../../apps/TwitchStreamersApp"));
const TwitchGamesApp_1 = __importDefault(require("../../apps/TwitchGamesApp"));
const TwitchStatsApp_1 = __importDefault(require("../../apps/TwitchStatsApp"));
const cacheTwitchFollows_1 = __importDefault(require("./tasks/cacheTwitchFollows"));
const cacheWatchlistVods_1 = __importDefault(require("./tasks/cacheWatchlistVods"));
const backupReports_1 = __importDefault(require("./tasks/backupReports"));
const checkIfEnabled = async (param) => {
    const settings = await settingsModel_1.default.findOne();
    if (!settings) {
        console.log('[App]: You need to initialize app configuration first');
        return false;
    }
    return { ...settings._doc }[param];
};
const scheduler = new toad_scheduler_1.ToadScheduler();
// Schedule tasks execution
// Twitch Streamers: Checks every 15 minutes if following streamers playing favorite games
const checkStreams = new toad_scheduler_1.SimpleIntervalJob({ minutes: +process.env.APP_FOLLOWS_TIMER }, new toad_scheduler_1.Task('checkStreams', async () => {
    if (await checkIfEnabled('enableFollowsCheck'))
        (0, TwitchStreamersApp_1.default)();
}));
scheduler.addSimpleIntervalJob(checkStreams);
// Twitch Games: Checks every 30 minutes for streamers that playing favorite games
const checkGames = new toad_scheduler_1.SimpleIntervalJob({ minutes: +process.env.APP_GAMES_TIMER }, new toad_scheduler_1.Task('checkGames', async () => {
    if (await checkIfEnabled('enableGamesCheck'))
        (0, TwitchGamesApp_1.default)();
}));
scheduler.addSimpleIntervalJob(checkGames);
// Twitch Stats: Checks every 24 hours for streamers stats in stats db and generates daily report
node_schedule_1.default.scheduleJob({ hour: 23, minute: 59, tz: 'Europe/Moscow' }, async () => {
    if (await checkIfEnabled('enableReportCreation'))
        (0, TwitchStatsApp_1.default)();
});
// Cache followed streamers data every day
node_schedule_1.default.scheduleJob({ hour: 23, minute: 58, tz: 'Europe/Moscow' }, cacheTwitchFollows_1.default);
// create twitch reports backup every day
node_schedule_1.default.scheduleJob({ hour: 0, minute: 5, tz: 'Europe/Moscow' }, backupReports_1.default);
// Get watchlist vod data
const checkWatchlist = new toad_scheduler_1.SimpleIntervalJob({ hours: 5 }, new toad_scheduler_1.Task('checkWatchlist', async () => {
    if (await checkIfEnabled('enableVodDataImport'))
        (0, cacheWatchlistVods_1.default)();
}));
scheduler.addSimpleIntervalJob(checkWatchlist);
// RENDER ONLY
if (+process.env.PORT * 1 !== 9500) {
    const wakeRender = new toad_scheduler_1.SimpleIntervalJob({ minutes: +process.env.APP_RECONNECT_TIMER }, new toad_scheduler_1.Task('wakeRender', async () => {
        await axios_1.default.get('https://node-twitch-favorites.onrender.com/');
    }));
    scheduler.addSimpleIntervalJob(wakeRender);
}
