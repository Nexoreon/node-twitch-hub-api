import { Router } from 'express';
import { addGameHistory, checkGamesActivity, createGame, deleteGame, getAllGames, getGame, updateGame } from '../controllers/TwitchGamesController';
import { createDailyReport, getReports } from '../controllers/TwitchReportController';
import { getBannedStreamer, getBannedStreamers, banStreamer, editBan, unbanStreamer } from '../controllers/TwitchBansController';
import {
    addVideo,
    checkVideosAvailability,
    deleteVideo,
    getParts,
    getSuggestions,
    getVideo,
    getVideos,
    moveSuggestion,
    updateVideo,
} from '../controllers/TwitchWatchlistController';
import {
    checkStreamersActivity,
    createStreamer,
    deleteStreamer,
    getStreamer,
    getStreamers,
    notifyOnNextGame,
    updateStreamer,
} from '../controllers/TwitchStreamersController';
import {
    checkReports,
    createReportsBackup,
    getNotificationData,
    getVodsData,
    importFollowList,
    resetNotificationStatus,
    searchGame,
    searchStreamer,
    setNotificationParam,
} from '../controllers/TwitchUtilsController';

const router = Router();

// Watchlist
router.route('/watchlist')
.get(getVideos)
.post(addVideo);

router.get('/getSuggestions', getSuggestions);
router.get('/watchlist/getParts', getParts);
router.get('/watchlist/checkVideosAvailability', checkVideosAvailability);
router.patch('/watchlist/moveSuggestion', moveSuggestion);

router.route('/watchlist/:id')
.get(getVideo)
.patch(updateVideo)
.delete(deleteVideo);

// Streamers
router.route('/')
.get(getStreamers)
.post(createStreamer);

router.patch('/streamers/notifyOnNextGame', notifyOnNextGame);

router.route('/streamers/:id')
.get(getStreamer)
.patch(updateStreamer)
.delete(deleteStreamer);

// Games
router.route('/games')
.get(getAllGames)
.post(createGame);

router.route('/games/:id')
.get(getGame)
.patch(updateGame)
.delete(deleteGame);

router.patch('/game/addHistory', addGameHistory);

// Reports
router.get('/reports', getReports);

// Bans
router.route('/banned-streamers')
.get(getBannedStreamers)
.post(banStreamer);

router.route('/banned-streamers/:id')
.get(getBannedStreamer)
.patch(editBan)
.delete(unbanStreamer);

// Utils
router.patch('/utils/getVodsData', getVodsData);
router.route('/utils/setNotificationParam')
.get(getNotificationData)
.patch(setNotificationParam);

router.get('/utils/checkReports', checkReports);
router.get('/utils/createReportsBackup', createReportsBackup);
router.get('/utils/importFollowList', importFollowList);
router.get('/utils/searchGame', searchGame);
router.get('/utils/searchStreamer', searchStreamer);
router.get('/utils/resetNotificationStatus', resetNotificationStatus);
router.get('/utils/checkStreamersActivity', checkStreamersActivity);
router.get('/utils/checkGamesActivity', checkGamesActivity);
router.post('/utils/createDailyReport', createDailyReport);

export default router;
