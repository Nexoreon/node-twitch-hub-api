import { Schema, model } from 'mongoose';

export interface ITwitchReportBackup {
    timestamp: Date;
    highlights: object[];
    follows: object[];
}

const twitchReportBackupSchema: Schema<ITwitchReportBackup> = new Schema({
    timestamp: Date,
    highlights: [Object],
    follows: [Object],
});

const TwitchReportBackup = model<ITwitchReportBackup>('th_reports-backup', twitchReportBackupSchema);

export default TwitchReportBackup;
