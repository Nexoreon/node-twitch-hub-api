"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const cors_1 = __importDefault(require("cors"));
require("./modules/SchedulerModule/SchedulerModule");
require("./modules/TelegramBot/TelegramBotModule");
require("./modules/testModule");
const appError_1 = __importDefault(require("./utils/appError"));
const errorController_1 = __importDefault(require("./controllers/errorController"));
const systemRoutes_1 = __importDefault(require("./routes/systemRoutes"));
const twitchRoutes_1 = __importDefault(require("./routes/twitchRoutes"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use((0, cors_1.default)());
app.use('/', systemRoutes_1.default);
app.use('/api/v1/twitch', twitchRoutes_1.default);
app.all('*', (req, res, next) => {
    next(new appError_1.default(`Unable to find ${req.originalUrl} on the server`, 404));
});
app.use(errorController_1.default);
exports.default = app;
