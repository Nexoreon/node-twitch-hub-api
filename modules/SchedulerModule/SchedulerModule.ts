/* eslint-disable no-console */
import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';
import nodeScheduler from 'node-schedule';
import axios from 'axios';
import Settings, { ISettings } from '../../models/settingsModel';

// Imported tasks
import TwitchStreamersApp from '../../apps/TwitchStreamersApp';
import TwitchGamesApp from '../../apps/TwitchGamesApp';
import TwitchStatsApp from '../../apps/TwitchStatsApp';
import cacheTwitchFollows from './tasks/cacheTwitchFollows';
import cacheWatchlistVods from './tasks/cacheWatchlistVods';
import backupReports from './tasks/backupReports';

const checkIfEnabled = async (param: string) => {
    const settings: ISettings | null = await Settings.findOne();
    if (!settings) {
        console.log('[App]: You need to initialize app configuration first');
        return false;
    }
    return { ...settings._doc }[param];
};
const scheduler = new ToadScheduler();

// Schedule tasks execution

// Twitch Streamers: Checks every 15 minutes if following streamers playing favorite games
const checkStreams = new SimpleIntervalJob({ minutes: +process.env.APP_FOLLOWS_TIMER! }, new Task('checkStreams', async () => {
    if (await checkIfEnabled('enableFollowsCheck')) TwitchStreamersApp();
}));
scheduler.addSimpleIntervalJob(checkStreams);

// Twitch Games: Checks every 30 minutes for streamers that playing favorite games
const checkGames = new SimpleIntervalJob({ minutes: +process.env.APP_GAMES_TIMER! }, new Task('checkGames', async () => {
    if (await checkIfEnabled('enableGamesCheck')) TwitchGamesApp();
}));
scheduler.addSimpleIntervalJob(checkGames);

// Twitch Stats: Checks every 24 hours for streamers stats in stats db and generates daily report
nodeScheduler.scheduleJob({ hour: 23, minute: 59, tz: 'Europe/Moscow' }, async () => {
    if (await checkIfEnabled('enableReportCreation')) TwitchStatsApp();
});

// Cache followed streamers data every day
nodeScheduler.scheduleJob({ hour: 23, minute: 58, tz: 'Europe/Moscow' }, cacheTwitchFollows);
// create twitch reports backup every day
nodeScheduler.scheduleJob({ hour: 0, minute: 5, tz: 'Europe/Moscow' }, backupReports);
// Get watchlist vod data
const checkWatchlist = new SimpleIntervalJob({ hours: 5 }, new Task('checkWatchlist', async () => {
    if (await checkIfEnabled('enableVodDataImport')) cacheWatchlistVods();
}));
scheduler.addSimpleIntervalJob(checkWatchlist);

// RENDER ONLY
if (+process.env.PORT! * 1 !== 9500) {
    const wakeRender = new SimpleIntervalJob({ minutes: +process.env.APP_RECONNECT_TIMER! }, new Task('wakeRender', async () => {
        await axios.get('https://node-twitch-favorites.onrender.com/');
    }));
    scheduler.addSimpleIntervalJob(wakeRender);
}
