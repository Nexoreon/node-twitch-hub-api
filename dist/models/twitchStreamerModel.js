"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchStreamerSchema = new mongoose_1.Schema({
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
const TwitchStreamer = (0, mongoose_1.model)('ma_twitch-streamers', twitchStreamerSchema);
exports.default = TwitchStreamer;
