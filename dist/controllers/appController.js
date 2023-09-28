"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendStatus = void 0;
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
// eslint-disable-next-line import/prefer-default-export
exports.sendStatus = (0, catchAsync_1.default)(async (req, res) => {
    res.status(200).json({
        server: 'ok',
        db: 'ok',
    });
});
