"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const TwitchCommon_1 = require("../../../apps/TwitchCommon");
const functions_1 = require("../../../utils/functions");
const twitchWatchlistModel_1 = __importDefault(require("../../../models/twitchWatchlistModel"));
exports.default = async () => {
    console.log(chalk_1.default.yellow('[Twitch Watchlist]: Запуск проверки и получения данных для ожидающих видео...'));
    const vods = await twitchWatchlistModel_1.default.find({ duration: { $exists: false }, platform: 'Twitch', 'flags.isAvailable': true });
    const ids = vods.map((vod) => `id=${vod.id}`);
    if (!ids.length)
        console.log(chalk_1.default.yellow('[Twitch Watchlist]: Видео без данных отсутствуют'));
    if (ids.length) {
        await axios_1.default.get(`https://api.twitch.tv/helix/videos?${ids.join('&')}`, {
            headers: functions_1.twitchHeaders,
        })
            .then(async (resp) => {
            const items = await resp.data.data;
            await items.map(async (vod) => {
                if (!vod.thumbnail_url.includes('404_processing')) {
                    await twitchWatchlistModel_1.default.findOneAndUpdate({ id: vod.id }, {
                        $set: {
                            duration: (0, TwitchCommon_1.convertDuration)(vod.duration),
                            thumbnail: vod.thumbnail_url,
                        },
                    })
                        .catch((err) => console.log(chalk_1.default.red('[Twitch Watchlist]: Ошибка обновления информации о видео!'), err));
                }
            });
        })
            .then(() => {
            console.log(chalk_1.default.green('[Twitch Watchlist]: Данные обновлены для доступных видео'));
        })
            .catch((err) => {
            console.log(chalk_1.default.red('[Twitch Watchlist]: Невозможно получить данные для удаленных видео'), err);
        });
    }
};
