import { Router } from 'express';
import { getSettings, createSettings, updateSettings } from '../controllers/settingsController';
import { getNotifications } from '../controllers/notificationController';
import { sendStatus } from '../controllers/appController';
import { testFunction } from '../controllers/TwitchUtilsController';

const router = Router();

router.get('/', sendStatus);
// TODO: add route protection
router.route('/api/v1/settings')
.get(getSettings)
.post(createSettings)
.patch(updateSettings);

router.get('/api/v1/notifications', getNotifications);

router.post('/api/v1/twitch/utils/testFunction', testFunction);

export default router;
