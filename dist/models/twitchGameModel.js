"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchGameSchema = new mongoose_1.Schema({
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
const TwitchGame = (0, mongoose_1.model)('ma_twitch-game', twitchGameSchema);
exports.default = TwitchGame;
