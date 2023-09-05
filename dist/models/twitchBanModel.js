"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchBanSchema = new mongoose_1.Schema({
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
const TwitchBan = (0, mongoose_1.model)('ma_twitch-ban', twitchBanSchema);
exports.default = TwitchBan;
