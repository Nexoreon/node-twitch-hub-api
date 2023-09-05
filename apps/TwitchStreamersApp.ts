/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';

import TwitchStreamer, { ITwitchStreamer, ITwitchStreamerHistory } from '../models/twitchStreamerModel';
import TwitchGame, { ITwitchGame } from '../models/twitchGameModel';
import TwitchStats, { ITwitchStats } from '../models/twitchStatsModel';
import TwitchBan, { ITwitchBan } from '../models/twitchBanModel';
import TwitchReport from '../models/twitchReportModel';
import { banStreamer, checkBannedStreamers, createStats, updateGameHistory, sendNotification, createVodSuggestion } from './TwitchCommon';
import { createNotification } from '../utils/functions';
import Settings from '../models/settingsModel';
import { IResponseStreamer } from '../types/types';

const addToStreamHistory = async (userId: string, userName: string, gameName: string, notify: boolean) => {
    const playedGames = await TwitchReport.aggregate([
        { $match: { 'follows.userName': userName } },
        { $unwind: '$follows' },
        { $match: { 'follows.userName': userName } },
        { $unwind: '$follows.games' },
        { $group: { _id: null, data: { $addToSet: '$follows.games.name' } } },
        { $project: { _id: 0 } },
    ]);
    let firstTime: boolean = true;
    if (playedGames.length) {
        const games = playedGames[0].data;
        firstTime = !games.includes(gameName); // check if streamer already played that game before
        console.log(userName, gameName, `notify: ${notify}`, `first time: ${firstTime}`); // TODO: Remove after testing
        if (notify && firstTime) {
            sendNotification({
                message: `${userName} впервые играет в ${gameName}`,
            }, { telegram: true });
        }
    }

    await TwitchStreamer.updateOne({ id: userId }, {
        $addToSet: { streamHistory: { name: gameName, firstTime } },
    });
};

export default async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Запуск проверки избранных стримеров...', new Date(Date.now()).toLocaleString()));
    const settings = await Settings.find();

    try {
        // Preparation. Fetch data from DB
        checkBannedStreamers();
        const streamersStats = await TwitchStats.find();
        const streamersStatsIDs = streamersStats.map((streamer: ITwitchStats) => streamer.userId);
        const bannedStreamers = await TwitchBan.find();
        const bannedStreamersIDs = bannedStreamers.map((streamer: ITwitchBan) => streamer.userId);
        const games = await TwitchGame.find();
        const gamesIDs = games.map((game: ITwitchGame) => game.id);
        const following = await TwitchStreamer.find();
        const followingIDs = following.map((streamer: ITwitchStreamer) => `user_id=${streamer.id}`);

        let foundStreams: boolean = false;
        let twitchResponse;

        // Fetch data from Twitch API
        try {
            const askTwitch = await axios.get(`https://api.twitch.tv/helix/streams?${followingIDs.join('&')}`, {
                headers: {
                    Authorization: process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT,
                },
            });
            console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Данные успешно получены с сервера Twitch. Обработка...'));
            twitchResponse = askTwitch.data.data; // set fetched data
        } catch (err: unknown) {
            console.log(chalk.red('[Twitch Streamers]: Ошибка получения актуальной информации о стримах!'), err);
        }

        // Handle fetched data
        twitchResponse.map(async (streamer: IResponseStreamer) => {
            const index = following.map((str: ITwitchStreamer) => str.id).indexOf(streamer.user_id);
            const streamerData = following[index];

            if (!streamerData.streamHistory.map((game: ITwitchStreamerHistory) => game.name).includes(streamer.game_name)
                && streamer.game_name !== 'Just Chatting') {
                addToStreamHistory(streamer.user_id, streamer.user_name, streamer.game_name, streamerData.flags.notifyOnNewGame);
            }
            if (gamesIDs.includes(streamer.game_id)) { // if streamer plays favorite game
                streamer.avatar = following[index].avatar; // set streamer picture

                if (!streamersStatsIDs.includes(streamer.user_id)) createStats(streamer);
                if (!bannedStreamersIDs.includes(streamer.user_id)) { // if streamer not temporarily banned
                    console.log(chalk.green(`[Twitch Streamers]: Стример ${streamer.user_name} играет в ${streamer.game_name}. Отправка уведомления...`));
                    foundStreams = true;
                    createNotification({
                        sendOut: Date.now(),
                        receivers: [process.env.USER_ID],
                        title: `${streamer.game_name}`,
                        content: `${streamer.user_name} играет в ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        image: streamer.avatar,
                    });
                    sendNotification({
                        title: `${streamer.game_name}`,
                        message: `${streamer.user_name} играет в ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        icon: streamer.avatar,
                        meta: {
                            game: streamer.game_name,
                            streamer: streamer.user_name,
                        },
                    }, settings[0].notifications.follows);
                    createVodSuggestion({
                        user_id: streamer.user_id,
                        games: [streamer.game_name],
                    });
                    updateGameHistory({ stream: streamer, isFavorite: true });
                    banStreamer(streamer);
                }
            }
        });
        if (!foundStreams) console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Подходящих по критериям стримов не найдено'));
    } catch (err: unknown) {
        console.log(chalk.red('[Twitch Streamers]: Произошла ошибка во время получения данных! Операция отменена.'), err);
    }
};
