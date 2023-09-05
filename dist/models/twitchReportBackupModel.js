"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const twitchReportBackupSchema = new mongoose_1.Schema({
    timestamp: Date,
    highlights: [Object],
    follows: [Object],
});
const TwitchReportBackup = (0, mongoose_1.model)('th_reports-backup', twitchReportBackupSchema);
exports.default = TwitchReportBackup;
