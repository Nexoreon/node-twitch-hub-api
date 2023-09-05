/* eslint-disable no-console */
import axios from 'axios';
import chalk from 'chalk';
import { twitchHeaders, convertDuration } from '../../../apps/TwitchCommon';
import { IResponseVod } from '../../../types/types';
import TwitchWatchlist, { ITwitchWatchlist } from '../../../models/twitchWatchlistModel';

export default async () => {
    console.log(chalk.yellow('[Twitch Watchlist]: Запуск проверки и получения данных для ожидающих видео...'));
    const vods = await TwitchWatchlist.find({ duration: { $exists: false }, platform: 'Twitch', 'flags.isAvailable': true });
    const ids = vods.map((vod: ITwitchWatchlist) => `id=${vod.id}`);

    if (!ids.length) console.log(chalk.yellow('[Twitch Watchlist]: Видео без данных отсутствуют'));
    if (ids.length) {
        await axios.get(`https://api.twitch.tv/helix/videos?${ids.join('&')}`, {
            headers: twitchHeaders,
        })
        .then(async (resp) => {
            const items = await resp.data.data;
            await items.map(async (vod: IResponseVod) => {
                if (!vod.thumbnail_url.includes('404_processing')) {
                    await TwitchWatchlist.findOneAndUpdate({ id: vod.id }, {
                        $set: {
                            duration: convertDuration(vod.duration),
                            thumbnail: vod.thumbnail_url,
                        },
                    })
                    .catch((err: unknown) => console.log(chalk.red('[Twitch Watchlist]: Ошибка обновления информации о видео!'), err));
                }
            });
        })
        .then(() => {
            console.log(chalk.green('[Twitch Watchlist]: Данные обновлены для доступных видео'));
        })
        .catch((err: unknown) => {
            console.log(chalk.red('[Twitch Watchlist]: Невозможно получить данные для удаленных видео'), err);
        });
    }
};
