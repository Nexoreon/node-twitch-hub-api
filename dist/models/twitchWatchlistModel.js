"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchWatchlistSchema = new mongoose_1.Schema({
    id: {
        type: String,
        required: [true, 'Vod should have ID from platform'],
        unique: true,
    },
    relatedTo: mongoose_1.Schema.Types.ObjectId,
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
const TwitchWatchlist = (0, mongoose_1.model)('ma_twitch-watchlist', twitchWatchlistSchema);
exports.default = TwitchWatchlist;
