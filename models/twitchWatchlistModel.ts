import { Types, Schema, model } from 'mongoose';

interface ITwitchWatchlistGame {
    name: string;
    coverId: string;
    favorite?: boolean;
}
export interface ITwitchWatchlist {
    id: string;
    relatedTo: Types.ObjectId;
    title: string;
    author: string;
    avatar: string;
    url: string;
    thumbnail: string;
    meta: {
        streamDate: Date;
        followers: number;
    };
    games: string[];
    gamesData: ITwitchWatchlistGame[];
    priority: number;
    duration: string;
    flags: {
        isAvailable: boolean;
        isSuggestion: boolean;
        withNewGames: boolean;
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
    title: {
        type: String,
        required: [true, 'Specify title of the vod'],
    },
    author: {
        type: String,
        required: [true, 'Specify streamer name'],
    },
    avatar: String,
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
    gamesData: [{
        name: String,
        coverId: String,
        favorite: {
            type: Boolean,
            default: false,
        },
    }],
    priority: {
        type: Number,
        min: 1,
        max: 100,
    },
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
        withNewGames: {
            type: Boolean,
            default: false,
        },
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
