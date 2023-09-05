import { Message } from 'node-telegram-bot-api';
import bot from '../../utils/TelegramBot';
import { handleShowCommands, handleCheckGames, handleCheckStreamers, handleGetReport } from './commands';

const myId = +process.env.TELEGRAM_MY_ID!;
bot.setMyCommands([
    { command: '/help', description: 'Показать список команд' },
    { command: '/check_follows', description: 'Проверить активность отслеживаемых стримеров' },
    { command: '/check_games', description: 'Проверить активность отслеживаемых игр' },
    { command: '/get_latest_report', description: 'Показать последний ежедневный отчёт' },
], { scope: { type: 'chat', chat_id: myId } });

bot.on('message', async (msg: Message) => {
    const chatId = msg.chat.id;
    if (!msg.from || msg.from && msg.from.id !== myId) return bot.sendMessage(chatId, '');
    const correctId = msg.from.id === myId;

    // Commands
    if (correctId && msg.text === '/help') return handleShowCommands(chatId);
    if (correctId && msg.text === '/check_follows') return handleCheckStreamers(chatId);
    if (correctId && msg.text === '/check_games') return handleCheckGames(chatId);
    if (correctId && msg.text === '/get_latest_report') return handleGetReport(chatId);
});

// bot.on('callback_query', async (msg: Message) => {
//     const chatId = msg.chat.id;
//     if (!msg.from || msg.from.id !== myId) return bot.sendMessage(chatId, '');
//     const correctId = msg.from.id === myId;
// });
