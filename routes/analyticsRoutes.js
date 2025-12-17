const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const analyticsController = require('../controllers/analyticsController');

// Protected route - get dashboard analytics
router.route('/dashboard')
    .get(authenticateToken, catchAsync(analyticsController.getDashboardAnalytics));

// Protected route - get monthly trends
router.route('/monthly-trends')
    .get(authenticateToken, catchAsync(analyticsController.getMonthlyTrends));

// Protected route - get warehouse names for filter
router.route('/warehouses')
    .get(authenticateToken, catchAsync(analyticsController.getWarehouseNames));

module.exports = router;