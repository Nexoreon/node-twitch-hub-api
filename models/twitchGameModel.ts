import { Schema, model } from 'mongoose';

export interface ITwitchGame {
    id: string;
    name: string;
    boxArt: string;
    search: {
        isSearchable: boolean;
        minViewers: number;
    };
    history: object[];
    addedAt: Date;
}

const twitchGameSchema: Schema<ITwitchGame> = new Schema({
    id: {
        type: String,
        required: [true, 'Game ID is required'],
        unique: true,
    },
    name: {
        type: String,
        required: [true, 'Game name is required'],
    },
    boxArt: String,
    search: {
        isSearchable: {
            type: Boolean,
            default: true,
        },
        minViewers: {
            type: Number,
            default: 2000,
        },
    },
    history: Array,
    addedAt: {
        type: Date,
        default: Date.now,
    },
});

const TwitchGame = model<ITwitchGame>('ma_twitch-game', twitchGameSchema);

export default TwitchGame;
