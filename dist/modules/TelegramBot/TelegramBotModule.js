"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const TelegramBot_1 = __importDefault(require("../../utils/TelegramBot"));
const commands_1 = require("./commands");
const myId = +process.env.TELEGRAM_MY_ID;
TelegramBot_1.default.setMyCommands([
    { command: '/help', description: 'Показать список команд' },
    { command: '/check_follows', description: 'Проверить активность отслеживаемых стримеров' },
    { command: '/check_games', description: 'Проверить активность отслеживаемых игр' },
    { command: '/get_latest_report', description: 'Показать последний ежедневный отчёт' },
], { scope: { type: 'chat', chat_id: myId } });
TelegramBot_1.default.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (!msg.from || msg.from && msg.from.id !== myId)
        return TelegramBot_1.default.sendMessage(chatId, '');
    const correctId = msg.from.id === myId;
    // Commands
    if (correctId && msg.text === '/help')
        return (0, commands_1.handleShowCommands)(chatId);
    if (correctId && msg.text === '/check_follows')
        return (0, commands_1.handleCheckStreamers)(chatId);
    if (correctId && msg.text === '/check_games')
        return (0, commands_1.handleCheckGames)(chatId);
    if (correctId && msg.text === '/get_latest_report')
        return (0, commands_1.handleGetReport)(chatId);
});
// bot.on('callback_query', async (msg: Message) => {
//     const chatId = msg.chat.id;
//     if (!msg.from || msg.from.id !== myId) return bot.sendMessage(chatId, '');
//     const correctId = msg.from.id === myId;
// });
