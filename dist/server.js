"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable import/first */
/* eslint-disable no-console */
const fs_1 = __importDefault(require("fs"));
const https_1 = __importDefault(require("https"));
const chalk_1 = __importDefault(require("chalk"));
const mongoose_1 = __importDefault(require("mongoose"));
// eslint-disable-next-line import/newline-after-import
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: './config.env' });
const app_1 = __importDefault(require("./app"));
const settingsModel_1 = __importDefault(require("./models/settingsModel"));
const TelegramBot_1 = __importDefault(require("./utils/TelegramBot"));
const functions_1 = require("./utils/functions");
let settings;
// Connect to database
mongoose_1.default.connect(process.env.DB_URL)
    .then(async () => {
    console.log(chalk_1.default.green('[Датабаза]: Успешное соединение с датабазой!'));
    settings = await settingsModel_1.default.findOne();
    (0, functions_1.initializeApp)(settings);
})
    .catch((err) => console.log('[Датабаза]: Ошибка соединения с датабазой!', err));
// Start server
let server;
const successMsg = chalk_1.default.green(`[Сервер]: Успешный запуск. Сервер прослушивается на порту: ${process.env.PORT}`);
if (+process.env.PORT === 9500) {
    const options = {
        key: fs_1.default.readFileSync('./keys/192.168.0.100-key.pem'),
        cert: fs_1.default.readFileSync('./keys/192.168.0.100.pem'),
        requestCert: false,
        rejectUnauthorized: false,
    };
    server = https_1.default.createServer(options, app_1.default).listen(process.env.PORT, () => {
        console.log(successMsg);
    });
}
else {
    server = app_1.default.listen(process.env.PORT || 5000, () => {
        console.log(successMsg);
    });
}
// Shutdown server
const shutdownServer = async (err) => {
    // TODO: Use global settings variable
    const settings = await settingsModel_1.default.find();
    const { notifications } = settings[0];
    if (notifications.error.telegram) {
        const text = `Критическая ошибка! Приложение было остановлено из за произошедшей ошибки
<code>${err}</code>`;
        new Promise(async (resolve) => {
            await TelegramBot_1.default.sendMessage(+process.env.TELEGRAM_MY_ID, text, {
                parse_mode: 'HTML',
            });
            setTimeout(resolve, 1000);
        })
            .finally(() => {
            server.close(() => {
                process.exit(1);
            });
        });
    }
    else {
        server.close(() => {
            process.exit(1);
        });
    }
};
process.on('uncaughtException', (err) => {
    console.log('UNCAUGHT EXCEPTION! Shutting Down...', err);
    shutdownServer(err);
});
process.on('unhandledRejection', (err) => {
    console.log('UNHANDLED REJECTION! Shutting Down...', err);
    shutdownServer(err);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM RECEIVED! Shutting down...');
    server.close(() => {
        process.exit(1);
    });
});
