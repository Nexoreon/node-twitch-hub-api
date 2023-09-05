import { Schema, model } from 'mongoose';

export interface ITwitchStreamerHistory {
    name: string;
    firstTime: boolean;
}

export interface ITwitchStreamer {
    _doc: Document;
    id: string;
    login: string;
    name: string;
    avatar: string;
    flags: {
        notifyOnNextGame: boolean;
        notifyOnNewGame: boolean;
    };
    streamHistory: ITwitchStreamerHistory[];
    gameName: string;
}

const twitchStreamerSchema: Schema<ITwitchStreamer> = new Schema({
    id: {
        type: String,
        required: [true, 'Streamer ID is required'],
        unique: true,
    },
    login: {
        type: String,
        required: [true, 'Streamer login is required'],
    },
    name: {
        type: String,
        required: [true, 'Streamer nickname is required'],
    },
    avatar: String,
    flags: {
        notifyOnNextGame: {
            type: Boolean,
            default: false,
        },
        notifyOnNewGame: {
            type: Boolean,
            default: true,
        },
    },
    streamHistory: [Object],
    gameName: String,
});

const TwitchStreamer = model<ITwitchStreamer>('ma_twitch-streamers', twitchStreamerSchema);

export default TwitchStreamer;
