"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const settingsSchema = new mongoose_1.Schema({
    accessToken: String,
    enableFollowsCheck: {
        type: Boolean,
        default: true,
    },
    enableGamesCheck: {
        type: Boolean,
        default: true,
    },
    enableReportCreation: {
        type: Boolean,
        default: true,
    },
    enableVodDataImport: {
        type: Boolean,
        default: true,
    },
    enableAddVodFavoriteGames: {
        type: Boolean,
        default: true,
    },
    enableAddVodNewGames: {
        type: Boolean,
        default: true,
    },
    notifications: {
        follows: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        games: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        reports: {
            push: {
                type: Boolean,
                default: true,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
        error: {
            push: {
                type: Boolean,
                default: false,
            },
            telegram: {
                type: Boolean,
                default: false,
            },
        },
    },
});
const Settings = (0, mongoose_1.model)('th_settings', settingsSchema);
exports.default = Settings;
