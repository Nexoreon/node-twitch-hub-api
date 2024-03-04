/* eslint-disable no-console */
import axios from 'axios';
import TwitchStreamer, { ITwitchStreamer } from '../../models/twitchStreamerModel';
import TwitchGame, { ITwitchGame } from '../../models/twitchGameModel';
import TwitchReport, { ITwitchReportFollows, ITwitchReportHighlights } from '../../models/twitchReportModel';
import bot from '../../utils/TelegramBot';

export const handleShowCommands = async (chatId: number) => {
    bot.sendMessage(chatId, `
/help - Показать список команд 
/check_follows - Проверить активность отслеживаемых стримеров
/check_games - Проверить активность отслеживаемых игр
/get_latest_report - Показать последний ежедневный отчёт`,
    );
};

export const handleCheckStreamers = async (chatId: number) => {
    try {
        const streamers = await TwitchStreamer.find();
        const ids = streamers.map((s: ITwitchStreamer) => `user_id=${s.id}`);

        const response = await axios.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, { // make a get request with streamers id
            headers: {
                Authorization: process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT,
            },
        });

        const online: string[] = [];

        interface IStreamerData {
            user_login: string;
            user_name: string;
            game_name: string;
        }

        response.data.data.map((s: IStreamerData) => {
            // eslint-disable-next-line max-len
            online.push(`<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong>`);
        });
        if (!online.length) return bot.sendMessage(chatId, 'В данный момент все отслеживаемые стримеры оффлайн');

        bot.sendMessage(chatId, `Следующие стримеры онлайн:\n\n${online.join('\n')}`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(`[Telegram Bot]: ERROR: ${err.message}`);
        }
        return bot.sendMessage(chatId, 'Произошла ошибка во время проверки активности стримеров! Попробуйте позже...');
    }
};

export const handleCheckGames = async (chatId: number) => {
    try {
        const games = await TwitchGame.find();
        const ids = games.map((g: ITwitchGame) => g.id);
        const getByIds = games.map((g: ITwitchGame) => `game_id=${g.id}`);

        const response = await axios.get(`https://api.twitch.tv/helix/streams?first=60&${getByIds.join('&')}`, {
            headers: {
                Authorization: process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT,
            },
        });

        const highlights: string[] = [];
        const allowedLangs = ['en', 'ru'];
        const viewersRequired = 1000;

        interface IResponseData {
            game_name: string
            game_id: string;
            user_login: string;
            user_name: string;
            viewer_count: number;
            language: string;
        }

        response.data.data.map((s: IResponseData) => {
            if (!ids.includes(s.game_id)) return;
            if (allowedLangs.includes(s.language) && s.viewer_count >= viewersRequired) {
                highlights.push(
                    // eslint-disable-next-line max-len
                    `<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong> с ${s.viewer_count} зрителей`,
                );
            }
        });

        const message = highlights.length ? `Найдены следующие стримы по отслеживаемым играм:\n\n${highlights.join('\n')}` : 'Подходящих стримов не найдено!';
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.log(`[Telegram Bot]: Error: ${err.message}`);
        }
        bot.sendMessage(chatId, 'Произошла ошибка во время проверки активности игр! Попробуйте позже...');
    }
};

export const handleGetReport = async (chatId: number) => {
    const report = await TwitchReport.findOne().sort('-timestamp');
    if (!report) return bot.sendMessage(chatId, 'Не найдено ни одного отчёта');

    const highlights: string[] = [];
    report.highlights.map((h: ITwitchReportHighlights) => {
        // eslint-disable-next-line max-len
        highlights.push(`• <strong><a href="https://twitch.tv/${h.userName}">${h.userName}</a></strong> играл в <strong><a href="https://twitch.tv/directory/game/${h.gameName}">${h.gameName}</a></strong> с ${h.viewers} зрителей`);
    });

    const follows: string[] = [];
    report.follows.map((f: ITwitchReportFollows) => {
        // eslint-disable-next-line max-len
        follows.push(`<strong><a href="https://twitch.tv/${f.userName}">${f.userName}</a></strong>\n• ${f.games.map((game: { name: string, firstTime: boolean }) => `${game.name}${game.firstTime ? ' 🆕' : ''}${game.name === 'Games + Demos' ? ' 🟨' : ''}`).join('\n• ')}`);
    });

    bot.sendMessage(chatId, `
Отчёт за ${new Date(report.timestamp).toLocaleDateString()}

<strong>Выделенное</strong>\n\n${highlights.length ? highlights.join('\n') : 'Отсутствует'}

<strong>Отслеживаемые стримеры</strong>\n\n${follows.join('\n\n')}
    `, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
