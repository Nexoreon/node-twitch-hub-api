/* eslint-disable import/first */
/* eslint-disable no-console */
import fs from 'fs';
import https from 'https';
import http from 'http';
import chalk from 'chalk';
import mongoose from 'mongoose';
// eslint-disable-next-line import/newline-after-import
import dotenv from 'dotenv';
dotenv.config({ path: './config.env' });
import app from './app';
import Settings from './models/settingsModel';
import telegramBot from './utils/TelegramBot';
import { initializeApp } from './utils/functions';

let settings;
// Connect to database
mongoose.connect(process.env.DB_URL!)
.then(async () => {
    console.log(chalk.green('[Датабаза]: Успешное соединение с датабазой!'));
    settings = await Settings.findOne();
    initializeApp(settings);
})
.catch((err: unknown) => console.log('[Датабаза]: Ошибка соединения с датабазой!', err));

// Start server
let server: http.Server | https.Server;
const successMsg = chalk.green(`[Сервер]: Успешный запуск. Сервер прослушивается на порту: ${process.env.PORT}`);

if (+process.env.PORT! === 9500) {
    const options = {
        key: fs.readFileSync('./keys/192.168.0.100-key.pem'),
        cert: fs.readFileSync('./keys/192.168.0.100.pem'),
        requestCert: false,
        rejectUnauthorized: false,
    };
    server = https.createServer(options, app).listen(process.env.PORT, () => {
        console.log(successMsg);
    });
} else {
    server = app.listen(process.env.PORT || 5000, () => {
        console.log(successMsg);
    });
}

// Shutdown server
const shutdownServer = async (err: unknown) => {
    // TODO: Use global settings variable
    const settings = await Settings.find();
    const { notifications } = settings[0];

    if (notifications.error.telegram) {
        const text = `Критическая ошибка! Приложение было остановлено из за произошедшей ошибки
<code>${err}</code>`;

        new Promise(async (resolve) => {
            await telegramBot.sendMessage(+process.env.TELEGRAM_MY_ID!, text, {
                parse_mode: 'HTML',
            });
            setTimeout(resolve, 1000);
        })
        .finally(() => {
            server.close(() => {
                process.exit(1);
            });
        });
    } else {
        server.close(() => {
            process.exit(1);
        });
    }
};

process.on('uncaughtException', (err: unknown) => {
    console.log('UNCAUGHT EXCEPTION! Shutting Down...', err);
    shutdownServer(err);
});

process.on('unhandledRejection', (err: unknown) => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err);
    shutdownServer(err);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
});
