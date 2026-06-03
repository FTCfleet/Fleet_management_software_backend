const express = require("express");
const catchAsync = require("../utils/catchAsync.js");
const router = express.Router();
const unloadingListController = require("../controllers/unloadingListController.js");
const { authenticateToken, isAppUser, isSupervisor } = require('../middleware/auth.js');

router.route('/new')
    .post(authenticateToken, isAppUser, catchAsync(unloadingListController.createUnloadingList));

router.route('/track/:id')
    .get(authenticateToken, isSupervisor, catchAsync(unloadingListController.trackUnloadingList));

router.route('/track-all/:date')
    .get(authenticateToken, catchAsync(unloadingListController.getUnloadingListsByDate));

module.exports = router;