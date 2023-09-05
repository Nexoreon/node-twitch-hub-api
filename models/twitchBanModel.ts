import { Schema, model } from 'mongoose';

export interface ITwitchBan {
    userId: string;
    userName: string;
    game: string;
    viewers: number;
    permanent: boolean;
    reason: string;
    date: Date;
    expiresIn: Date;
}

const twitchBanSchema: Schema<ITwitchBan> = new Schema({
    userId: {
        type: String,
        unique: true,
    },
    userName: String,
    game: String,
    viewers: Number,
    permanent: {
        type: Boolean,
        default: false,
    },
    reason: String,
    date: {
        type: Date,
        default: Date.now,
    },
    expiresIn: Date,
});

const TwitchBan = model<ITwitchBan>('ma_twitch-ban', twitchBanSchema);

export default TwitchBan;
