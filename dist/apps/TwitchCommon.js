"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkActiveGame = exports.createVodSuggestion = exports.sendNotification = exports.createStats = exports.checkBannedStreamers = exports.banStreamer = exports.updateGameHistory = exports.convertDuration = void 0;
/* eslint-disable camelcase */
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const beamsClient_1 = __importDefault(require("../utils/beamsClient"));
const TelegramBot_1 = __importDefault(require("../utils/TelegramBot"));
const twitchStreamerModel_1 = __importDefault(require("../models/twitchStreamerModel"));
const twitchGameModel_1 = __importDefault(require("../models/twitchGameModel"));
const twitchStatsModel_1 = __importDefault(require("../models/twitchStatsModel"));
const twitchWatchlistModel_1 = __importDefault(require("../models/twitchWatchlistModel"));
const twitchBanModel_1 = __importDefault(require("../models/twitchBanModel"));
const functions_1 = require("../utils/functions");
const convertDuration = (duration) => {
    const includesHours = duration.includes('h');
    const h = duration.split('h');
    const m = h[includesHours ? 1 : 0].split('m');
    const s = m[1].split('s');
    const hours = h[0];
    let minutes = m[0];
    let seconds = s[0];
    if (minutes.length !== 2)
        minutes = `0${m[0]}`;
    if (seconds.length !== 2)
        seconds = `0${s[0]}`;
    return `${includesHours ? `${hours}:` : ''}${minutes}:${seconds}`;
};
exports.convertDuration = convertDuration;
const updateGameHistory = async ({ stream, isFavorite }) => {
    await twitchGameModel_1.default.findOneAndUpdate({ id: stream.game_id }, {
        $push: {
            history: {
                streamId: stream.id,
                streamerId: stream.user_id,
                streamer: stream.user_login,
                viewers: stream.viewer_count,
                favorite: isFavorite,
                timestamp: Date.now(),
            },
        },
    });
};
exports.updateGameHistory = updateGameHistory;
const banStreamer = async (stream) => {
    await twitchBanModel_1.default.create({
        userId: stream.user_id,
        userName: stream.user_name,
        game: stream.game_name,
        viewers: stream.viewer_count,
        reason: 'Temp ban',
        expiresIn: Date.now() + 43200000,
    });
};
exports.banStreamer = banStreamer;
const checkBannedStreamers = async () => {
    await twitchBanModel_1.default.deleteMany({ permanent: false, expiresIn: { $lte: Date.now() } })
        .then((unbanned) => unbanned.deletedCount);
};
exports.checkBannedStreamers = checkBannedStreamers;
const createStats = async (stream) => {
    await twitchStatsModel_1.default.create({
        userId: stream.user_id,
        userName: stream.user_name,
        gameId: stream.game_id,
        gameName: stream.game_name,
        viewers: stream.viewer_count,
        title: stream.title,
    });
};
exports.createStats = createStats;
const sendNotification = ({ title, message, link, icon, meta }, method = { push: true }) => {
    if (method.push) {
        beamsClient_1.default.publishToInterests(['project'], {
            web: {
                notification: {
                    title,
                    body: message,
                    deep_link: link,
                    icon,
                },
            },
        })
            .then(() => console.log('[Pusher]: Уведомление успешно отправлено'))
            .catch((err) => console.log(chalk_1.default.red('[Pusher]: Ошибка отправки уведомления!'), err));
    }
    if (method.telegram) {
        const chatId = +process.env.TELEGRAM_MY_ID;
        if (!icon)
            return TelegramBot_1.default.sendMessage(chatId, message);
        TelegramBot_1.default.sendPhoto(chatId, icon, {
            caption: message,
            ...(meta && { reply_markup: {
                    inline_keyboard: [
                        [{ text: '🎙️ Стример', url: link }, { text: '🎮 Игра', url: `https://twitch.tv/game/${meta.game}` }],
                    ],
                } }),
        });
    }
};
exports.sendNotification = sendNotification;
const createVodSuggestion = async ({ streamId, userId, games, flags }) => {
    console.log('createVodSuggesion', userId, games, flags);
    const getVideo = await axios_1.default.get(`https://api.twitch.tv/helix/videos?user_id=${userId}`, {
        headers: functions_1.twitchHeaders,
    });
    const getFollowers = await axios_1.default.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`, {
        headers: functions_1.twitchHeaders,
    });
    const data = getVideo.data.data[0];
    const { id, title, user_name: author, created_at: streamDate, url } = data;
    const followers = getFollowers.data.total;
    console.log(streamId, id);
    // Checks if streamId and VOD ID is the same, if not, the vod probably been deleted
    // if (id !== streamId) {
    //     return console.log(chalk.red('[Twitch Watchlist]: Stream ID and VOD ID aren\'t the same. Perhaps VOD isn\'t available anymore'));
    // }
    // find existing suggestions with the same author and game
    const suggestionExists = await twitchWatchlistModel_1.default.findOne({
        $or: [{ author, games: { $in: games }, relatedTo: { $exists: false } }, { id, relatedTo: { $exists: false } }],
    });
    if (suggestionExists && id === suggestionExists.id) {
        return twitchWatchlistModel_1.default.findOneAndUpdate({ id }, {
            $addToSet: { games },
        });
    }
    await twitchWatchlistModel_1.default.create({
        id,
        title,
        author,
        games,
        url,
        meta: {
            streamDate,
            followers,
        },
        flags: {
            isSuggestion: true,
            ...(flags && flags.newGame && { withNewGames: true }),
        },
        ...(!flags && suggestionExists && { relatedTo: suggestionExists._id }),
    })
        .catch((err) => {
        if ('code' in err) {
            const isDuplicateError = err.code === 11000;
            console.log(isDuplicateError ? chalk_1.default.red('Такое видео уже было добавлено в список предложений ранее!') : console.log(err));
        }
    });
};
exports.createVodSuggestion = createVodSuggestion;
const checkActiveGame = async (id, removeJob, everyGame) => {
    const removeNotifyingData = async () => {
        await twitchStreamerModel_1.default.findOneAndUpdate({ id }, {
            $set: { 'flags.notifyOnNextGame': false },
            $unset: { gameName: 1 },
        });
        removeJob();
    };
    const updateCurrentGame = async (game) => {
        await twitchStreamerModel_1.default.findOneAndUpdate({ id }, {
            $set: { gameName: game },
        });
    };
    const streamer = await twitchStreamerModel_1.default.findOne({ id }).select({ gameName: 1, avatar: 1 });
    if (!streamer)
        return console.log(chalk_1.default.red('[Twitch Streamers]: Такого стримера не найдено в системе! Отмена операции...'));
    const response = await axios_1.default.get(`https://api.twitch.tv/helix/streams?user_id=${id}`, {
        headers: functions_1.twitchHeaders,
    });
    const streamData = response.data.data[0];
    if (!streamData) {
        console.log('[Twitch Streamers]: Стример закончил стримить. Удаление задачи...');
        return removeNotifyingData();
    }
    if (everyGame && streamData.game_name !== streamer.gameName) {
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...');
        (0, exports.sendNotification)({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            link: `https://twitch.tv/${streamData.user_login}`,
        });
        return updateCurrentGame(streamData.game_name);
    }
    if (streamData.game_name !== streamer.gameName) { // if streamer changed the game, send notification and remove this job
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...');
        (0, exports.sendNotification)({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            link: `https://twitch.tv/${streamData.user_login}`,
        });
        return removeNotifyingData();
    }
    console.log(`[Twitch Streamers]: Стример ${streamData.user_name} ещё не сменил игру`);
};
exports.checkActiveGame = checkActiveGame;
