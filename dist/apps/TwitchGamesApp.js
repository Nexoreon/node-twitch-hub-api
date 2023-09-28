"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const cli_table_1 = __importDefault(require("cli-table"));
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const twitchGameModel_1 = __importDefault(require("../models/twitchGameModel"));
const twitchBanModel_1 = __importDefault(require("../models/twitchBanModel"));
const twitchStatsModel_1 = __importDefault(require("../models/twitchStatsModel"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const TwitchCommon_1 = require("./TwitchCommon");
const functions_1 = require("../utils/functions");
exports.default = async () => {
    console.log(chalk_1.default.yellowBright('[Twitch Games]: Запуск проверки игр на Twitch...'), new Date(Date.now()).toLocaleString());
    const settings = await settingsModel_1.default.findOne();
    if (!settings)
        return console.log(chalk_1.default.red('[Twitch Games]: You need to initialize app configuration first'));
    const allowedLangs = process.env.APP_GAMES_ALLOWED_LANGS.split(',') || ['en'];
    try {
        // Preparation
        (0, TwitchCommon_1.checkBannedStreamers)();
        const dbStreamersStats = await twitchStatsModel_1.default.find();
        const streamersStatsIDs = dbStreamersStats.map((streamer) => streamer.userId);
        const dbBannedStreamers = await twitchBanModel_1.default.find();
        const bannedStreamersIDs = dbBannedStreamers.map((streamer) => streamer.userId);
        const dbFavoriteStreamers = await twitchStreamerModel_1.default.find();
        const favoriteStreamersIDs = dbFavoriteStreamers.map((streamer) => streamer.id);
        const dbGames = await twitchGameModel_1.default.find({ 'search.isSearchable': true }); // get favorite games from db
        const gamesIDs = dbGames.map((game) => game.id); // get game ids list
        const getGamesIDs = dbGames.map((game) => `game_id=${game.id}`); // convert ids to query params for http request
        let twitchResponse;
        const table = new cli_table_1.default({
            head: ['Min. viewers', 'Current viewers', 'Game', 'Streamer', 'Title'],
            colWidths: [15, 15, 25, 25, 27],
        });
        const tableArray = [];
        // Request data from Twitch API
        try {
            const askTwitch = await axios_1.default.get(`https://api.twitch.tv/helix/streams?first=60&${getGamesIDs.join('&')}`, {
                headers: {
                    Authorization: process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT,
                },
            });
            console.log(chalk_1.default.yellowBright('[Twitch Games]: Данные о стримах успешно получены. Обработка...'));
            twitchResponse = askTwitch.data.data; // set fetched data (fetched data contains streamers that are currently playing previously specified games)
        }
        catch (e) {
            console.log(chalk_1.default.red('[Twitch Games]: Ошибка получения данных о стримах!'), e);
        }
        // Handle fetched data
        twitchResponse.map(async (stream) => {
            // Twitch API bugfix applied: skip ids that are not from ids list
            // If streamer id is in the banned list or favorite list, skip him. Allow selected langs by default: en.
            if (!bannedStreamersIDs.includes(stream.user_id)
                && !favoriteStreamersIDs.includes(stream.user_id)
                && gamesIDs.includes(stream.game_id)
                && allowedLangs.includes(stream.language)) {
                if (!streamersStatsIDs.includes(stream.user_id) && stream.viewer_count >= 2000)
                    (0, TwitchCommon_1.createStats)(stream);
                const gameIndex = gamesIDs.indexOf(stream.game_id); // get game id that streamer currently playing
                const gameCover = dbGames[gameIndex].boxArt.replace('XSIZExYSIZE', '100x140'); // get game box art
                const { minViewers } = dbGames[gameIndex].search; // min amount of viewers required to trigger notification
                if (stream.viewer_count >= 1000) {
                    tableArray.push([minViewers.toString(), stream.viewer_count.toString(), stream.game_name, stream.user_name, stream.title]);
                }
                if (stream.viewer_count >= minViewers) { // if streamer has more viewers than specified in minViewers variable...
                    console.log(chalk_1.default.yellowBright(`Найден стример ${stream.user_name} который играет в ${stream.game_name} с ${stream.viewer_count} зрителями. Отсылка уведомления...`));
                    (0, functions_1.createNotification)({
                        sendOut: Date.now(),
                        receivers: [process.env.USER_ID],
                        title: stream.game_name,
                        content: `${stream.user_name} играет в ${stream.game_name} с ${stream.viewer_count} зрителями`,
                        link: `https://twitch.tv/${stream.user_login}`,
                        image: gameCover,
                    });
                    (0, TwitchCommon_1.sendNotification)({
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
                        (0, TwitchCommon_1.createVodSuggestion)({
                            streamId: stream.id,
                            userId: stream.user_id,
                            games: [stream.game_name],
                        });
                    }
                    (0, TwitchCommon_1.updateGameHistory)({ stream, isFavorite: false });
                    (0, TwitchCommon_1.banStreamer)(stream);
                }
            }
        });
        table.push(...tableArray);
        if (table.length) {
            console.log(table.toString());
        }
        else {
            console.log(chalk_1.default.yellowBright('[Twitch Games]: No relevant streams found! Table isn\'t going to be created'));
        }
    }
    catch (err) {
        console.log(chalk_1.default.red('[Twitch Games]: Произошла ошибка во время выполнения приложения! Операция отменена.'), err);
    }
};
