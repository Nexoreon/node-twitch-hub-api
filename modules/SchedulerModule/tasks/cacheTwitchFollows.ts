/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import TwitchStreamer, { ITwitchStreamer } from '../../../models/twitchStreamerModel';

export default async () => {
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Старт кэширования стримеров...'));
    const streamers = await TwitchStreamer.find();
    const ids = streamers.map((s: ITwitchStreamer) => `id=${s.id}`);

    if (!ids.length) return console.log(chalk.red('[Twitch Streamers]: Список отслеживаемых стримеров пустой. Задача отменена'));

    const response = await axios.get(`https://api.twitch.tv/helix/users?${ids.join('&')}`, {
        headers: {
            Authorization: process.env.TWITCH_TOKEN,
            'client-id': process.env.TWITCH_CLIENT,
        },
    })
    .catch((err: unknown) => console.log(chalk.red(`[Twitch Streamers]: Ошибка получения данных стримеров! ${err}`)));
    if (!response!.data) return null;

    interface IResponseData {
        id: string;
        login: string;
        display_name: string;
        profile_image_url: string;
    }

    await response!.data.data.map(async (streamer: IResponseData) => {
        await TwitchStreamer.findOneAndUpdate({ id: streamer.id }, {
            login: streamer.login,
            name: streamer.display_name,
            avatar: streamer.profile_image_url,
        });
    });
    console.log(chalk.hex('#a970ff')('[Twitch Streamers]: Отслеживаемые стримеры успешно прокэшированны!'));
};
