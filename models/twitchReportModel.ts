import { Schema, model } from 'mongoose';
import { ITwitchStreamer } from './twitchStreamerModel';

export interface ITwitchReportHighlights {
    userId: string;
    userName: string;
    gameId: string;
    gameName: string;
    viewers: number;
    timestamp: Date;
}

export interface ITwitchReportFollows {
    userName: string;
    games: {
        name: string;
        firstTime: boolean;
    }[];
    avatar: string;
}

export interface ITwitchReport {
    timestamp: Date;
    highlights: ITwitchReportHighlights[];
    follows: ITwitchReportFollows[];
    followList: ITwitchStreamer[];
    items: ITwitchReportFollows[];
}

const twitchReportSchema: Schema<ITwitchReport> = new Schema({
    timestamp: Date,
    highlights: [Object],
    follows: [Object],
});

const TwitchReport = model<ITwitchReport>('ma_twitch-report', twitchReportSchema);

export default TwitchReport;
