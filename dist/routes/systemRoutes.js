"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const notificationController_1 = require("../controllers/notificationController");
const appController_1 = require("../controllers/appController");
const router = (0, express_1.Router)();
router.get('/', appController_1.sendStatus);
// TODO: add route protection
router.route('/api/v1/settings')
    .get(settingsController_1.getSettings)
    .post(settingsController_1.createSettings)
    .patch(settingsController_1.updateSettings);
router.get('/api/v1/notifications', notificationController_1.getNotifications);
exports.default = router;
