import { Types, Schema, model } from 'mongoose';

export interface ITwitchWatchlist {
    id: string;
    relatedTo: Types.ObjectId;
    platform: 'Twitch' | 'YouTube';
    title: string;
    author: string;
    url: string;
    thumbnail: string;
    meta: {
        streamDate: Date;
        followers: number;
    };
    games: string[];
    priority: number;
    notes: string;
    duration: string;
    flags: {
        isAvailable: boolean;
        isSuggestion: boolean;
        isShortTerm: boolean;
        watchLater: boolean;
    };
    sortDate: Date;
    addedAt: Date;
    updatedAt: Date;
}

const twitchWatchlistSchema: Schema<ITwitchWatchlist> = new Schema({
    id: {
        type: String,
        required: [true, 'Vod should have ID from platform'],
        unique: true,
    },
    relatedTo: Schema.Types.ObjectId,
    platform: {
        type: String,
        enum: ['Twitch', 'YouTube'],
        required: [true, 'Specify platform of the video'],
        default: 'Twitch',
    },
    title: {
        type: String,
        required: [true, 'Specify title of the vod'],
    },
    author: {
        type: String,
        required: [true, 'Specify streamer name'],
    },
    url: {
        type: String,
        required: [true, 'Specify link for the vod'],
    },
    thumbnail: String,
    meta: {
        streamDate: Date,
        followers: Number,
    },
    games: {
        type: [String],
        required: [true, 'Specify name of the games'],
    },
    priority: {
        type: Number,
        min: 1,
        max: 100,
    },
    notes: String,
    duration: String,
    flags: {
        isAvailable: {
            type: Boolean,
            default: true,
        },
        isSuggestion: {
            type: Boolean,
            default: false,
        },
        isShortTerm: Boolean,
        watchLater: Boolean,
    },
    sortDate: {
        type: Date,
        default: Date.now,
    },
    addedAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: Date,
});

const TwitchWatchlist = model<ITwitchWatchlist>('ma_twitch-watchlist', twitchWatchlistSchema);

export default TwitchWatchlist;
