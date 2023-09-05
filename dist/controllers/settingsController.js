"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = exports.createSettings = void 0;
const settingsModel_1 = __importDefault(require("../models/settingsModel"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const functions_1 = require("../utils/functions");
// possible errors
const sendError404 = (0, functions_1.sendError)('Сначала инициализируйте настройки!', 404);
const sendError403 = (0, functions_1.sendError)('Настройки были инициализированы ранее!', 403);
exports.createSettings = (0, catchAsync_1.default)(async (req, res, next) => {
    const checkSettings = await settingsModel_1.default.find();
    if (checkSettings.length)
        return next(sendError403);
    await settingsModel_1.default.create(req.body);
    res.status(201).json({
        status: 'ok',
        message: 'Настройки успешно инициализированы!',
    });
});
exports.getSettings = (0, catchAsync_1.default)(async (req, res, next) => {
    const settings = await settingsModel_1.default.find();
    if (!settings.length)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        data: settings[0],
    });
});
exports.updateSettings = (0, catchAsync_1.default)(async (req, res, next) => {
    const settings = await settingsModel_1.default.updateOne({}, { $set: { ...req.body } });
    if (!settings)
        return next(sendError404);
    res.status(200).json({
        status: 'ok',
        message: 'Настройки успешно обновлены',
    });
});
