"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const twitchStreamerModel_1 = __importDefault(require("../../../models/twitchStreamerModel"));
exports.default = async () => {
    console.log(chalk_1.default.hex('#a970ff')('[Twitch Streamers]: Старт кэширования стримеров...'));
    const streamers = await twitchStreamerModel_1.default.find();
    const ids = streamers.map((s) => `id=${s.id}`);
    if (!ids.length)
        return console.log(chalk_1.default.red('[Twitch Streamers]: Список отслеживаемых стримеров пустой. Задача отменена'));
    const response = await axios_1.default.get(`https://api.twitch.tv/helix/users?${ids.join('&')}`, {
        headers: {
            Authorization: process.env.TWITCH_TOKEN,
            'client-id': process.env.TWITCH_CLIENT,
        },
    })
        .catch((err) => console.log(chalk_1.default.red(`[Twitch Streamers]: Ошибка получения данных стримеров! ${err}`)));
    if (!response.data)
        return null;
    await response.data.data.map(async (streamer) => {
        await twitchStreamerModel_1.default.findOneAndUpdate({ id: streamer.id }, {
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url,
        });
    });
    console.log(chalk_1.default.hex('#a970ff')('[Twitch Streamers]: Отслеживаемые стримеры успешно прокэшированны!'));
};
