import { Router } from 'express';
import { getSettings, createSettings, updateSettings } from '../controllers/settingsController';
import { getNotifications } from '../controllers/notificationController';

const router = Router();

// TODO: add route protection
router.route('/settings')
.get(getSettings)
.post(createSettings)
.patch(updateSettings);

router.get('/notifications', getNotifications);

export default router;
