"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchReportSchema = new mongoose_1.Schema({
    timestamp: Date,
    highlights: [Object],
    follows: [Object],
});
const TwitchReport = (0, mongoose_1.model)('ma_twitch-report', twitchReportSchema);
exports.default = TwitchReport;
