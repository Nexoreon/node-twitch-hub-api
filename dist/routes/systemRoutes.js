"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const settingsController_1 = require("../controllers/settingsController");
const notificationController_1 = require("../controllers/notificationController");
const router = (0, express_1.Router)();
// TODO: add route protection
router.route('/settings')
    .get(settingsController_1.getSettings)
    .post(settingsController_1.createSettings)
    .patch(settingsController_1.updateSettings);
router.get('/notifications', notificationController_1.getNotifications);
exports.default = router;
