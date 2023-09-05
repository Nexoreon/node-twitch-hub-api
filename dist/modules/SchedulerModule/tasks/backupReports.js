"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
const chalk_1 = __importDefault(require("chalk"));
const twitchReportModel_1 = __importDefault(require("../../../models/twitchReportModel"));
const twitchReportBackupModel_1 = __importDefault(require("../../../models/twitchReportBackupModel"));
exports.default = async () => {
    console.log(chalk_1.default.yellow('[Twitch Reports]: Запуск создания бэкапа отчётов...'));
    let hasAnomaly = false;
    const reportsCount = await twitchReportModel_1.default.count();
    if (reportsCount < 10)
        hasAnomaly = true;
    if (!hasAnomaly) {
        const reports = await twitchReportModel_1.default.find();
        await twitchReportBackupModel_1.default.deleteMany();
        await twitchReportBackupModel_1.default.insertMany(reports);
        console.log(chalk_1.default.yellow('[Twitch Reports]: Создания бэкапа отчётов успешно завершено!'));
    }
    else {
        console.log(chalk_1.default.red('[Twitch Reports]: Обнаружена аномалия! Создание бэкапа отчётов невозможно'));
    }
};
