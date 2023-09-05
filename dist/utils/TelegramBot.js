"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
exports.default = bot;
