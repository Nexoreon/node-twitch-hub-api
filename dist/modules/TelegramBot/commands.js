"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleGetReport = exports.handleCheckGames = exports.handleCheckStreamers = exports.handleShowCommands = void 0;
/* eslint-disable no-console */
const axios_1 = __importDefault(require("axios"));
const twitchStreamerModel_1 = __importDefault(require("../../models/twitchStreamerModel"));
const twitchGameModel_1 = __importDefault(require("../../models/twitchGameModel"));
const twitchReportModel_1 = __importDefault(require("../../models/twitchReportModel"));
const TelegramBot_1 = __importDefault(require("../../utils/TelegramBot"));
const handleShowCommands = async (chatId) => {
    TelegramBot_1.default.sendMessage(chatId, `
/help - Показать список команд 
/check_follows - Проверить активность отслеживаемых стримеров
/check_games - Проверить активность отслеживаемых игр
/get_latest_report - Показать последний ежедневный отчёт`);
};
exports.handleShowCommands = handleShowCommands;
const handleCheckStreamers = async (chatId) => {
    try {
        const streamers = await twitchStreamerModel_1.default.find();
        const ids = streamers.map((s) => `user_id=${s.id}`);
        const response = await axios_1.default.get(`https://api.twitch.tv/helix/streams?${ids.join('&')}`, {
            headers: {
                Authorization: process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT,
            },
        });
        const online = [];
        response.data.data.map((s) => {
            // eslint-disable-next-line max-len
            online.push(`<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong>`);
        });
        if (!online.length)
            return TelegramBot_1.default.sendMessage(chatId, 'В данный момент все отслеживаемые стримеры оффлайн');
        TelegramBot_1.default.sendMessage(chatId, `Следующие стримеры онлайн:\n\n${online.join('\n')}`, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.log(`[Telegram Bot]: ERROR: ${err.message}`);
        }
        return TelegramBot_1.default.sendMessage(chatId, 'Произошла ошибка во время проверки активности стримеров! Попробуйте позже...');
    }
};
exports.handleCheckStreamers = handleCheckStreamers;
const handleCheckGames = async (chatId) => {
    try {
        const games = await twitchGameModel_1.default.find();
        const ids = games.map((g) => g.id);
        const getByIds = games.map((g) => `game_id=${g.id}`);
        const response = await axios_1.default.get(`https://api.twitch.tv/helix/streams?first=60&${getByIds.join('&')}`, {
            headers: {
                Authorization: process.env.TWITCH_TOKEN,
                'client-id': process.env.TWITCH_CLIENT,
            },
        });
        const highlights = [];
        const allowedLangs = ['en', 'ru'];
        const viewersRequired = 1000;
        response.data.data.map((s) => {
            if (!ids.includes(s.game_id))
                return;
            if (allowedLangs.includes(s.language) && s.viewer_count >= viewersRequired) {
                highlights.push(
                // eslint-disable-next-line max-len
                `<strong><a href="https://twitch.tv/${s.user_login}">${s.user_name}</a></strong> играет в <strong><a href="https://twitch.tv/directory/game/${s.game_name}">${s.game_name}</a></strong> с ${s.viewer_count} зрителей`);
            }
        });
        const message = highlights.length ? `Найдены следующие стримы по отслеживаемым играм:\n\n${highlights.join('\n')}` : 'Подходящих стримов не найдено!';
        TelegramBot_1.default.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
        });
    }
    catch (err) {
        if (err instanceof Error) {
            console.log(`[Telegram Bot]: Error: ${err.message}`);
        }
        TelegramBot_1.default.sendMessage(chatId, 'Произошла ошибка во время проверки активности игр! Попробуйте позже...');
    }
};
exports.handleCheckGames = handleCheckGames;
const handleGetReport = async (chatId) => {
    const report = await twitchReportModel_1.default.findOne().sort('-timestamp');
    if (!report)
        return TelegramBot_1.default.sendMessage(chatId, 'Не найдено ни одного отчёта');
    const highlights = [];
    report.highlights.map((h) => {
        // eslint-disable-next-line max-len
        highlights.push(`• <strong><a href="https://twitch.tv/${h.userName}">${h.userName}</a></strong> играл в <strong><a href="https://twitch.tv/directory/game/${h.gameName}">${h.gameName}</a></strong> с ${h.viewers} зрителей`);
    });
    const follows = [];
    report.follows.map((f) => {
        // eslint-disable-next-line max-len
        follows.push(`<strong><a href="https://twitch.tv/${f.userName}">${f.userName}</a></strong>\n• ${f.games.map((game) => `${game.name}${game.firstTime ? ' 🆕' : ''}${game.name === 'Games + Demos' ? ' 🟨' : ''}`).join('\n• ')}`);
    });
    TelegramBot_1.default.sendMessage(chatId, `
Отчёт за ${new Date(report.timestamp).toLocaleDateString()}

<strong>Выделенное</strong>\n\n${highlights.length ? highlights.join('\n') : 'Отсутствует'}

<strong>Отслеживаемые стримеры</strong>\n\n${follows.join('\n\n')}
    `, {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
    });
};
exports.handleGetReport = handleGetReport;
