"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unbanStreamer = exports.editBan = exports.getBannedStreamer = exports.getBannedStreamers = exports.banStreamer = void 0;
const twitchBanModel_1 = __importDefault(require("../models/twitchBanModel"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
// possible errors
const sendError404 = (0, functions_1.sendError)('Такого стримера нету в списке забаненных!', 404);
exports.banStreamer = (0, catchAsync_1.default)(async (req, res) => {
    let { expiresIn } = req.body;
    expiresIn = Date.now() + expiresIn * 3600000; // received hours * ms
    const newStreamer = await twitchBanModel_1.default.create({ ...req.body, expiresIn });
    res.status(201).json({
        status: 'ok',
        data: newStreamer,
    });
});
exports.getBannedStreamers = (0, catchAsync_1.default)(async (req, res) => {
    const bannedStreamers = await twitchBanModel_1.default.find().sort({ date: -1 });
    res.status(200).json({
        status: 'ok',
        data: bannedStreamers,
    });
});
exports.getBannedStreamer = (0, catchAsync_1.default)(async (req, res, next) => {
    const bannedStreamer = await twitchBanModel_1.default.findById(req.params.id);
    if (!bannedStreamer)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: bannedStreamer,
    });
});
exports.editBan = (0, catchAsync_1.default)(async (req, res, next) => {
    const { date, expiresIn, permanent, reason } = req.body;
    const bannedStreamer = await twitchBanModel_1.default.findByIdAndUpdate(req.params.id, { date, expiresIn, permanent, reason }, { new: true });
    if (!bannedStreamer)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        message: 'Данные о блокировке успешно отредактированы',
    });
});
exports.unbanStreamer = (0, catchAsync_1.default)(async (req, res, next) => {
    const streamer = await twitchBanModel_1.default.findByIdAndDelete(req.params.id);
    if (!streamer)
        return next(sendError404);
    res.status(204).json({
        status: 'ok',
        message: 'Стример успешно разбанен',
    });
});
