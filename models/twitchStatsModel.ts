import { Schema, model } from 'mongoose';

export interface ITwitchStats {
    userId: string;
    userName: string;
    gameId: string;
    gameName: string;
    viewers: number;
    title: string;
    date: Date;
}

const twitchStatsSchema: Schema<ITwitchStats> = new Schema({
    userId: String,
    userName: String,
    gameId: String,
    gameName: String,
    viewers: Number,
    title: String,
    date: {
        type: Date,
        default: Date.now,
    },
});

const TwitchStats = model<ITwitchStats>('ma_twitch-stats', twitchStatsSchema);

export default TwitchStats;
