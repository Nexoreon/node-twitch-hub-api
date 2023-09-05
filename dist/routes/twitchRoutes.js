"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TwitchGamesController_1 = require("../controllers/TwitchGamesController");
const TwitchReportController_1 = require("../controllers/TwitchReportController");
const TwitchBansController_1 = require("../controllers/TwitchBansController");
const TwitchWatchlistController_1 = require("../controllers/TwitchWatchlistController");
const TwitchStreamersController_1 = require("../controllers/TwitchStreamersController");
const TwitchUtilsController_1 = require("../controllers/TwitchUtilsController");
const router = (0, express_1.Router)();
// Watchlist
router.route('/watchlist')
    .get(TwitchWatchlistController_1.getVideos)
    .post(TwitchWatchlistController_1.addVideo);
router.get('/getSuggestions', TwitchWatchlistController_1.getSuggestions);
router.get('/watchlist/getParts', TwitchWatchlistController_1.getParts);
router.get('/watchlist/checkVideosAvailability', TwitchWatchlistController_1.checkVideosAvailability);
router.patch('/watchlist/moveSuggestion', TwitchWatchlistController_1.moveSuggestion);
router.route('/watchlist/:id')
    .get(TwitchWatchlistController_1.getVideo)
    .patch(TwitchWatchlistController_1.updateVideo)
    .delete(TwitchWatchlistController_1.deleteVideo);
// Streamers
router.route('/')
    .get(TwitchStreamersController_1.getStreamers)
    .post(TwitchStreamersController_1.createStreamer);
router.patch('/streamers/notifyOnNextGame', TwitchStreamersController_1.notifyOnNextGame);
router.route('/streamers/:id')
    .get(TwitchStreamersController_1.getStreamer)
    .patch(TwitchStreamersController_1.updateStreamer)
    .delete(TwitchStreamersController_1.deleteStreamer);
// Games
router.route('/games')
    .get(TwitchGamesController_1.getAllGames)
    .post(TwitchGamesController_1.createGame);
router.route('/games/:id')
    .get(TwitchGamesController_1.getGame)
    .patch(TwitchGamesController_1.updateGame)
    .delete(TwitchGamesController_1.deleteGame);
router.patch('/game/addHistory', TwitchGamesController_1.addGameHistory);
// Reports
router.get('/reports', TwitchReportController_1.getReports);
// Bans
router.route('/banned-streamers')
    .get(TwitchBansController_1.getBannedStreamers)
    .post(TwitchBansController_1.banStreamer);
router.route('/banned-streamers/:id')
    .get(TwitchBansController_1.getBannedStreamer)
    .patch(TwitchBansController_1.editBan)
    .delete(TwitchBansController_1.unbanStreamer);
// Utils
router.patch('/utils/getVodsData', TwitchUtilsController_1.getVodsData);
router.route('/utils/setNotificationParam')
    .get(TwitchUtilsController_1.getNotificationData)
    .patch(TwitchUtilsController_1.setNotificationParam);
router.get('/utils/checkReports', TwitchUtilsController_1.checkReports);
router.get('/utils/createReportsBackup', TwitchUtilsController_1.createReportsBackup);
router.get('/utils/importFollowList', TwitchUtilsController_1.importFollowList);
router.get('/utils/searchGame', TwitchUtilsController_1.searchGame);
router.get('/utils/searchStreamer', TwitchUtilsController_1.searchStreamer);
router.get('/utils/resetNotificationStatus', TwitchUtilsController_1.resetNotificationStatus);
router.get('/utils/checkStreamersActivity', TwitchStreamersController_1.checkStreamersActivity);
router.get('/utils/checkGamesActivity', TwitchGamesController_1.checkGamesActivity);
router.post('/utils/createDailyReport', TwitchReportController_1.createDailyReport);
exports.default = router;
