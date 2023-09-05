"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const push_notifications_server_1 = __importDefault(require("@pusher/push-notifications-server"));
const beamsClient = new push_notifications_server_1.default({
    instanceId: process.env.PUSH_INSTANCE,
    secretKey: process.env.PUSH_KEY,
});
exports.default = beamsClient;
