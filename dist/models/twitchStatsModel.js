"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchStatsSchema = new mongoose_1.Schema({
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
const TwitchStats = (0, mongoose_1.model)('ma_twitch-stats', twitchStatsSchema);
exports.default = TwitchStats;
