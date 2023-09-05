/* eslint-disable no-console */
import chalk from 'chalk';
import Table from 'cli-table';

import TwitchStats, { ITwitchStats } from '../models/twitchStatsModel';
import TwitchStreamer, { ITwitchStreamerHistory } from '../models/twitchStreamerModel';
import TwitchReport from '../models/twitchReportModel';
import TwitchGame, { ITwitchGame } from '../models/twitchGameModel';
import Settings from '../models/settingsModel';
import { sendNotification } from './TwitchCommon';
import { createNotification } from '../utils/functions';
import { handleGetReport } from '../modules/TelegramBot/commands';

export default async () => {
    console.log(chalk.greenBright('[Twitch Stats]: Запуск составления ежедневного отчёта по стримам...'));
    const settings = await Settings.find();

    try {
        // Preparation. Fetch data from DB
        const stats = await TwitchStats.find();
        const games = await TwitchGame.find();
        const gamesIDs = games.map((game: ITwitchGame) => game.id); // extract ids from games db
        const followsHistory = await TwitchStreamer.find({ streamHistory: { $exists: 1 } }, { streamHistory: 1, name: 1, _id: 0 });
        if (!stats.length && !followsHistory.length) {
            return console.log(chalk.greenBright('[Twitch Stats]: Нету стримов для показа! Таблица сгенерирована не будет'));
        }

        const tableArray: Array<Array<string>> = [];
        const table = new Table({
            head: ['Min. viewers', 'Total viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 10, 35, 25, 25],
        });

        // Handle fetched data
        const statsArray: object[] = [];
        stats.map((stream: ITwitchStats) => {
            const findIndex = gamesIDs.indexOf(stream.gameId);
            const minViewers = games[findIndex].search.minViewers || 2000;
            tableArray.push([minViewers.toString(), stream.viewers.toString(), stream.gameName, stream.userName, stream.title]);
            statsArray.push({ // push current streamer data to the stats array
                userId: stream.userId,
                userName: stream.userName,
                gameId: stream.gameId,
                gameName: stream.gameName,
                viewers: stream.viewers,
                timestamp: stream.date,
            });
        });

        const followsHistoryArray: object[] = [];
        followsHistory.map(({ streamHistory, name }: { streamHistory: ITwitchStreamerHistory[], name: string }) => {
            followsHistoryArray.push({ userName: name, games: streamHistory });
        });
        console.log(chalk.greenBright('[Twitch Stats]: Ежедневный отчёт о стримах готов! Добавление отчёта в датабазу...'));

        // Create report
        await TwitchReport.create({
            timestamp: Date.now(),
            highlights: statsArray,
            follows: followsHistoryArray,
        })
        .then(() => console.log(chalk.greenBright('[Twitch Stats]: Отчёт был добавлен в датабазу. Вывод таблицы и отсылка уведомления...')))
        .catch((err: unknown) => console.log(chalk.red('[Twitch Stats]: Ошибка отправки отчёта в датабазу!'), err));

        table.push(...tableArray);

        // Create and send notification
        createNotification({
            sendOut: Date.now(),
            receivers: [process.env.USER_ID],
            title: 'Отчёт о стримах готов',
            content: 'Ежедневный отчёт о стримах за день готов',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub',
            image: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
        });
        sendNotification({
            title: 'Отчёт о стримах готов',
            message: 'Ежедневный отчёт о стримах за день готов',
            icon: 'https://192.168.0.100/site/MiniApps/TwitchStreamers/icon.jpg',
            link: 'https://192.168.0.100/database/mini-apps/twitch-hub',
        }, { push: settings[0].notifications.reports.push });
        if (settings[0].notifications.reports.telegram) handleGetReport(+process.env.TELEGRAM_MY_ID!);

        // Delete temporal data and show generated table
        await TwitchStreamer.updateMany({ streamHistory: { $exists: 1 } }, { $unset: { streamHistory: 1 } });
        await TwitchStats.deleteMany();
        console.log(table.toString());
    } catch (err: unknown) {
        console.log(chalk.red('[Twitch Stats]: Произошла ошибка составления отчёта! Отмена операции.'), err);
    }
};
