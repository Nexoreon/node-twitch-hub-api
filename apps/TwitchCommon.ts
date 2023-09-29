/* eslint-disable camelcase */
/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import pushNotification from '../utils/beamsClient';
import telegramBot from '../utils/TelegramBot';

import TwitchStreamer from '../models/twitchStreamerModel';
import TwitchGame from '../models/twitchGameModel';
import TwitchStats from '../models/twitchStatsModel';
import TwitchWatchlist from '../models/twitchWatchlistModel';
import TwitchBan from '../models/twitchBanModel';
import { INotifyMethod, IPushNotification, IResponseStreamer } from '../types/types';
import { IMongoDBError } from '../controllers/errorController';

export const twitchHeaders = {
    Authorization: process.env.TWITCH_TOKEN,
    'client-id': process.env.TWITCH_CLIENT,
};

export const convertDuration = (duration: string) => {
    const includesHours = duration.includes('h');
    const h = duration.split('h');
    const m = h[includesHours ? 1 : 0].split('m');
    const s = m[1].split('s');
    const hours = h[0];
    let minutes: string = m[0];
    let seconds: string = s[0];
    if (minutes.length !== 2) minutes = `0${m[0]}`;
    if (seconds.length !== 2) seconds = `0${s[0]}`;
    return `${includesHours ? `${hours}:` : ''}${minutes}:${seconds}`;
};

export const updateGameHistory = async ({ stream, isFavorite }: { stream: IResponseStreamer, isFavorite: boolean }) => {
    await TwitchGame.findOneAndUpdate({ id: stream.game_id }, { // add mark about this event to the game doc
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

export const banStreamer = async (stream: IResponseStreamer) => {
    await TwitchBan.create({ // set a cooldown for this streamer for 6 hours
        userId: stream.user_id,
        userName: stream.user_name,
        game: stream.game_name,
        viewers: stream.viewer_count,
        reason: 'Temp ban',
        expiresIn: Date.now() + 43200000,
    });
};

export const checkBannedStreamers = async () => {
    await TwitchBan.deleteMany({ permanent: false, expiresIn: { $lte: Date.now() } })
    .then((unbanned: { deletedCount: number }) => unbanned.deletedCount);
};

export const createStats = async (stream: IResponseStreamer) => {
    await TwitchStats.create({
        userId: stream.user_id,
        userName: stream.user_name,
        gameId: stream.game_id,
        gameName: stream.game_name,
        viewers: stream.viewer_count,
        title: stream.title,
    });
};

export const sendNotification = ({ title, message, link, icon, meta }: IPushNotification, method: INotifyMethod = { push: true }) => {
    if (method.push) {
        pushNotification.publishToInterests(['project'], {
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
        .catch((err: Error) => console.log(chalk.red('[Pusher]: Ошибка отправки уведомления!'), err));
    }

    if (method.telegram) {
        const chatId = +process.env.TELEGRAM_MY_ID!;
        if (!icon) return telegramBot.sendMessage(chatId, message);
        telegramBot.sendPhoto(chatId, icon, {
            caption: message,
            ...(meta && { reply_markup: {
                inline_keyboard: [
                    [{ text: '🎙️ Стример', url: link }, { text: '🎮 Игра', url: `https://twitch.tv/game/${meta.game}` }],
                ],
            } }),
        });
    }
};

interface ICreateVodProps {
    streamId: string;
    userId: string;
    games: string[];
    flags?: {
        newGame: boolean;
    };
}

export const createVodSuggestion = async ({ streamId, userId, games, flags }: ICreateVodProps) => {
    console.log('createVodSuggesion', userId, games, flags)
    const getVideo = await axios.get(`https://api.twitch.tv/helix/videos?user_id=${userId}`, {
        headers: twitchHeaders,
    });
    const getFollowers = await axios.get(`https://api.twitch.tv/helix/channels/followers?broadcaster_id=${userId}`, {
        headers: twitchHeaders,
    });

    interface IVideoData {
        id: string;
        title: string;
        user_name: string;
        created_at: Date;
        url: string;
    }
    const data: IVideoData = getVideo.data.data[0];
    const { id, title, user_name: author, created_at: streamDate, url } = data;
    const followers = getFollowers.data.total;

    console.log(streamId, id)
    // Checks if streamId and VOD ID is the same, if not, the vod probably been deleted
    // if (id !== streamId) {
    //     return console.log(chalk.red('[Twitch Watchlist]: Stream ID and VOD ID aren\'t the same. Perhaps VOD isn\'t available anymore'));
    // }

    // find existing suggestions with the same author and game
    const suggestionExists = await TwitchWatchlist.findOne({
        $or: [{ author, games: { $in: games }, relatedTo: { $exists: false } }, { id, relatedTo: { $exists: false } }],
    });

    if (suggestionExists && id === suggestionExists.id) {
        return TwitchWatchlist.findOneAndUpdate({ id }, {
            $addToSet: { games },
        });
    }

    await TwitchWatchlist.create({
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
    .catch((err: IMongoDBError) => {
        if ('code' in err) {
            const isDuplicateError = err.code === 11000;
            console.log(isDuplicateError ? chalk.red('Такое видео уже было добавлено в список предложений ранее!') : console.log(err));
        }
    });
};

export const checkActiveGame = async (id: string, removeJob: () => void, everyGame: boolean) => {
    const removeNotifyingData = async () => {
        await TwitchStreamer.findOneAndUpdate({ id }, {
            $set: { 'flags.notifyOnNextGame': false },
            $unset: { gameName: 1 },
        });
        removeJob();
    };

    const updateCurrentGame = async (game: string) => {
        await TwitchStreamer.findOneAndUpdate({ id }, {
            $set: { gameName: game },
        });
    };

    const streamer = await TwitchStreamer.findOne({ id }).select({ gameName: 1, avatar: 1 });
    if (!streamer) return console.log(chalk.red('[Twitch Streamers]: Такого стримера не найдено в системе! Отмена операции...'));
    const response = await axios.get(`https://api.twitch.tv/helix/streams?user_id=${id}`, {
        headers: twitchHeaders,
    });
    const streamData = response.data.data[0];

    if (!streamData) {
        console.log('[Twitch Streamers]: Стример закончил стримить. Удаление задачи...');
        return removeNotifyingData();
    }

    if (everyGame && streamData.game_name !== streamer.gameName) {
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...');
        sendNotification({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            link: `https://twitch.tv/${streamData.user_login}`,
        });
        return updateCurrentGame(streamData.game_name);
    }

    if (streamData.game_name !== streamer.gameName) { // if streamer changed the game, send notification and remove this job
        console.log('[Twitch Streamers]: Стример начал играть в другую игру. Отправка уведомления...');
        sendNotification({
            title: `${streamData.user_name} перешёл к следующей игре`,
            message: `Стример начал играть в ${streamData.game_name}`,
            link: `https://twitch.tv/${streamData.user_login}`,
        });
        return removeNotifyingData();
    }

    console.log(`[Twitch Streamers]: Стример ${streamData.user_name} ещё не сменил игру`);
};
