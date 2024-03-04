/* eslint-disable no-console */
import chalk from 'chalk';
import TwitchReport from '../../../models/twitchReportModel';
import TwitchReportBackup from '../../../models/twitchReportBackupModel';

export default async () => {
    console.log(chalk.yellow('[Twitch Reports]: Запуск создания бэкапа отчётов...'));
    let hasAnomaly: boolean = false;
    const reportsCount = await TwitchReport.countDocuments();
    if (reportsCount < 10) hasAnomaly = true;

    if (!hasAnomaly) {
        const reports = await TwitchReport.find();
        await TwitchReportBackup.deleteMany();
        await TwitchReportBackup.insertMany(reports);
        console.log(chalk.yellow('[Twitch Reports]: Создания бэкапа отчётов успешно завершено!'));
    } else {
        console.log(chalk.red('[Twitch Reports]: Обнаружена аномалия! Создание бэкапа отчётов невозможно'));
    }
};
