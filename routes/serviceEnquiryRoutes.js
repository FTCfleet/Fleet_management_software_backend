const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const serviceEnquiryController = require('../controllers/serviceEnquiryController');

// Public route - anyone can submit (rate limited by IP in controller)
router.route('/')
    .post(catchAsync(serviceEnquiryController.createEnquiry));

// Protected route - only authenticated users can view all enquiries
router.route('/all')
    .get(authenticateToken, catchAsync(serviceEnquiryController.getAllEnquiries));

// Protected route - delete enquiry by ID
router.route('/:id')
    .delete(authenticateToken, catchAsync(serviceEnquiryController.deleteEnquiry));

// Protected route - get unseen enquiries count
router.route('/unseen/count')
    .get(authenticateToken, catchAsync(serviceEnquiryController.getUnseenCount));

// Protected route - mark all enquiries as read
router.route('/mark-read')
    .patch(authenticateToken, catchAsync(serviceEnquiryController.markAllAsRead));

module.exports = router;
