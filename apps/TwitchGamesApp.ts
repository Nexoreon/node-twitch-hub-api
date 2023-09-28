/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import Table from 'cli-table';

import Settings from '../models/settingsModel';
import TwitchGame, { ITwitchGame } from '../models/twitchGameModel';
import TwitchBan, { ITwitchBan } from '../models/twitchBanModel';
import TwitchStats, { ITwitchStats } from '../models/twitchStatsModel';
import TwitchStreamer, { ITwitchStreamer } from '../models/twitchStreamerModel';
import { banStreamer, checkBannedStreamers, updateGameHistory, createStats, sendNotification, createVodSuggestion } from './TwitchCommon';
import { createNotification } from '../utils/functions';
import { IResponseStreamer } from '../types/types';

export default async () => {
    console.log(chalk.yellowBright('[Twitch Games]: Запуск проверки игр на Twitch...'), new Date(Date.now()).toLocaleString());
    const settings = await Settings.findOne();
    if (!settings) return console.log(chalk.red('[Twitch Games]: You need to initialize app configuration first'));
    const allowedLangs = process.env.APP_GAMES_ALLOWED_LANGS!.split(',') || ['en'];

    try {
        // Preparation
        checkBannedStreamers();
        const dbStreamersStats = await TwitchStats.find();
        const streamersStatsIDs = dbStreamersStats.map((streamer: ITwitchStats) => streamer.userId);

        const dbBannedStreamers = await TwitchBan.find();
        const bannedStreamersIDs = dbBannedStreamers.map((streamer: ITwitchBan) => streamer.userId);

        const dbFavoriteStreamers = await TwitchStreamer.find();
        const favoriteStreamersIDs = dbFavoriteStreamers.map((streamer: ITwitchStreamer) => streamer.id);

        const dbGames = await TwitchGame.find({ 'search.isSearchable': true }); // get favorite games from db
        const gamesIDs = dbGames.map((game: ITwitchGame) => game.id); // get game ids list
        const getGamesIDs = dbGames.map((game: ITwitchGame) => `game_id=${game.id}`); // convert ids to query params for http request
        let twitchResponse;

        const table = new Table({
            head: ['Min. viewers', 'Current viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 15, 25, 25, 27],
        });
        const tableArray: Array<Array<string>> = [];

        // Request data from Twitch API
        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?first=60&${getGamesIDs.join('&')}`, {
                headers: {
                    Authorization: process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT,
                },
            });
            console.log(chalk.yellowBright('[Twitch Games]: Данные о стримах успешно получены. Обработка...'));
            twitchResponse = askTwitch.data.data; // set fetched data (fetched data contains streamers that are currently playing previously specified games)
        } catch (e: unknown) {
            console.log(chalk.red('[Twitch Games]: Ошибка получения данных о стримах!'), e);
        }

        // Handle fetched data
        twitchResponse.map(async (stream: IResponseStreamer) => {
            // Twitch API bugfix applied: skip ids that are not from ids list
            // If streamer id is in the banned list or favorite list, skip him. Allow selected langs by default: en.
            if (
                !bannedStreamersIDs.includes(stream.user_id)
                && !favoriteStreamersIDs.includes(stream.user_id)
                && gamesIDs.includes(stream.game_id)
                && allowedLangs.includes(stream.language)
            ) {
                if (!streamersStatsIDs.includes(stream.user_id) && stream.viewer_count >= 2000) createStats(stream);

                const gameIndex = gamesIDs.indexOf(stream.game_id); // get game id that streamer currently playing
                const gameCover = dbGames[gameIndex].boxArt.replace('XSIZExYSIZE', '100x140'); // get game box art
                const { minViewers } = dbGames[gameIndex].search; // min amount of viewers required to trigger notification

                if (stream.viewer_count >= 1000) {
                    tableArray.push([minViewers.toString(), stream.viewer_count.toString(), stream.game_name, stream.user_name, stream.title]);
                }
                if (stream.viewer_count >= minViewers) { // if streamer has more viewers than specified in minViewers variable...
                    console.log(
                        chalk.yellowBright(
                            `Найден стример ${stream.user_name} который играет в ${stream.game_name} с ${stream.viewer_count} зрителями. Отсылка уведомления...`,
                        ),
                    );
                    createNotification({
                        sendOut: Date.now(),
                        receivers: [process.env.USER_ID],
                        title: stream.game_name,
                        content: `${stream.user_name} играет в ${stream.game_name} с ${stream.viewer_count} зрителями`,
                        link: `https://twitch.tv/${stream.user_login}`,
                        image: gameCover,
                    });
                    sendNotification({
                        title: stream.game_name,
                        message: `${stream.user_name} играет в ${stream.game_name} с ${stream.viewer_count} зрителями`,
                        link: `https://twitch.tv/${stream.user_login}`,
                        icon: gameCover,
                        meta: {
                            game: stream.game_name,
                            streamer: stream.user_name,
                        },
                    }, settings.notifications.games);
                    if (settings.enableAddVodFavoriteGames) {
                        createVodSuggestion({
                            streamId: stream.id,
                            userId: stream.user_id,
                            games: [stream.game_name],
                        });
                    }
                    updateGameHistory({ stream, isFavorite: false });
                    banStreamer(stream);
                }
            }
        });

        table.push(...tableArray);
        if (table.length) {
            console.log(table.toString());
        } else {
            console.log(chalk.yellowBright('[Twitch Games]: No relevant streams found! Table isn\'t going to be created'));
        }
    } catch (err: unknown) {
        console.log(chalk.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), err);
    }
};
