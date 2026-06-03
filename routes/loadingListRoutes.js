const express = require("express");
const catchAsync = require("../utils/catchAsync.js");
const router = express.Router();
const loadingListController = require("../controllers/loadingListController.js");
const { authenticateToken, isAppUser, isSupervisor } = require('../middleware/auth');

router.route('/new')
    .post(authenticateToken, isAppUser, catchAsync(loadingListController.createLoadingList));

router.route('/track/:id')
    .get(authenticateToken, isSupervisor, catchAsync(loadingListController.trackLoadingList));

router.route('/track-all/:date')
    .get(authenticateToken, catchAsync(loadingListController.getLoadingListsByDate));

module.exports = router;