"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const twitchGameModel_1 = __importDefault(require("../models/twitchGameModel"));
const twitchStatsModel_1 = __importDefault(require("../models/twitchStatsModel"));
const twitchBanModel_1 = __importDefault(require("../models/twitchBanModel"));
const twitchReportModel_1 = __importDefault(require("../models/twitchReportModel"));
const TwitchCommon_1 = require("./TwitchCommon");
const functions_1 = require("../utils/functions");
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const addToStreamHistory = async (streamId, userId, userName, gameName, notify, addVod) => {
    const playedGames = await twitchReportModel_1.default.aggregate([
        { $match: { 'follows.userName': userName } },
        { $unwind: '$follows' },
        { $match: { 'follows.userName': userName } },
        { $unwind: '$follows.games' },
        { $group: { _id: null, data: { $addToSet: '$follows.games.name' } } },
        { $project: { _id: 0 } },
    ]);
    let firstTime = true;
    if (playedGames.length) {
        const games = playedGames[0].data;
        firstTime = !games.includes(gameName); // check if streamer already played that game before
        if (notify && firstTime) {
            (0, TwitchCommon_1.sendNotification)({
                message: `${userName} впервые играет в ${gameName}`,
            }, { telegram: true });
            if (addVod) {
                (0, TwitchCommon_1.createVodSuggestion)({
                    streamId,
                    userId,
                    games: [gameName],
                    flags: { newGame: true },
                });
            }
        }
    }
    await twitchStreamerModel_1.default.updateOne({ id: userId }, {
        $addToSet: { streamHistory: { name: gameName, firstTime } },
    });
};
exports.default = async () => {
    console.log(chalk_1.default.hex('#a970ff')('[Twitch Streamers]: Запуск проверки избранных стримеров...', new Date(Date.now()).toLocaleString()));
    const settings = await settingsModel_1.default.findOne();
    if (!settings)
        return console.log(chalk_1.default.red('[Twitch Streamers]: You need to initialize app configuration first'));
    try {
        // Preparation. Fetch data from DB
        (0, TwitchCommon_1.checkBannedStreamers)();
        const streamersStats = await twitchStatsModel_1.default.find();
        const streamersStatsIDs = streamersStats.map((streamer) => streamer.userId);
        const bannedStreamers = await twitchBanModel_1.default.find();
        const bannedStreamersIDs = bannedStreamers.map((streamer) => streamer.userId);
        const games = await twitchGameModel_1.default.find();
        const gamesIDs = games.map((game) => game.id);
        const following = await twitchStreamerModel_1.default.find();
        const followingIDs = following.map((streamer) => `user_id=${streamer.id}`);
        let foundStreams = false;
        let twitchResponse;
        // Fetch data from Twitch API
        try {
            const askTwitch = await axios_1.default.get(`https://api.twitch.tv/helix/streams?${followingIDs.join('&')}`, {
                headers: {
                    Authorization: process.env.TWITCH_TOKEN,
                    'client-id': process.env.TWITCH_CLIENT,
                },
            });
            console.log(chalk_1.default.hex('#a970ff')('[Twitch Streamers]: Данные успешно получены с сервера Twitch. Обработка...'));
            twitchResponse = askTwitch.data.data; // set fetched data
        }
        catch (err) {
            console.log(chalk_1.default.red('[Twitch Streamers]: Ошибка получения актуальной информации о стримах!'), err);
        }
        // Handle fetched data
        twitchResponse.map(async (streamer) => {
            const index = following.map((str) => str.id).indexOf(streamer.user_id);
            const streamerData = following[index];
            if (!streamerData.streamHistory.map((game) => game.name).includes(streamer.game_name)
                && streamer.game_name !== 'Just Chatting') {
                addToStreamHistory(streamer.id, streamer.user_id, streamer.user_name, streamer.game_name, streamerData.flags.notifyOnNewGame, settings.enableAddVodNewGames);
            }
            if (gamesIDs.includes(streamer.game_id)) { // if streamer plays favorite game
                streamer.avatar = following[index].avatar; // set streamer picture
                if (!streamersStatsIDs.includes(streamer.user_id))
                    (0, TwitchCommon_1.createStats)(streamer);
                if (!bannedStreamersIDs.includes(streamer.user_id)) { // if streamer not temporarily banned
                    console.log(chalk_1.default.green(`[Twitch Streamers]: Стример ${streamer.user_name} играет в ${streamer.game_name}. Отправка уведомления...`));
                    foundStreams = true;
                    (0, functions_1.createNotification)({
                        sendOut: Date.now(),
                        receivers: [process.env.USER_ID],
                        title: `${streamer.game_name}`,
                        content: `${streamer.user_name} играет в ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        image: streamer.avatar,
                    });
                    (0, TwitchCommon_1.sendNotification)({
                        title: `${streamer.game_name}`,
                        message: `${streamer.user_name} играет в ${streamer.game_name}`,
                        link: `https://twitch.tv/${streamer.user_login}`,
                        icon: streamer.avatar,
                        meta: {
                            game: streamer.game_name,
                            streamer: streamer.user_name,
                        },
                    }, settings.notifications.follows);
                    if (settings.enableAddVodFavoriteGames) {
                        (0, TwitchCommon_1.createVodSuggestion)({
                            streamId: streamer.id,
                            userId: streamer.user_id,
                            games: [streamer.game_name],
                        });
                    }
                    (0, TwitchCommon_1.updateGameHistory)({ stream: streamer, isFavorite: true });
                    (0, TwitchCommon_1.banStreamer)(streamer);
                }
            }
        });
        if (!foundStreams)
            console.log(chalk_1.default.hex('#a970ff')('[Twitch Streamers]: Подходящих по критериям стримов не найдено'));
    }
    catch (err) {
        console.log(chalk_1.default.red('[Twitch Streamers]: Произошла ошибка во время получения данных! Операция отменена.'), err);
    }
};
