const express = require('express');
const router = express.Router();
const paymentTrackingController = require('../controllers/paymentTrackingController.js');
const { protect } = require('../middleware/auth.js');

// Get all To Pay parcels (with optional date filter)
router.get('/', protect, paymentTrackingController.getToPayParcels);

// Get memos with To Pay orders (new memo-based endpoint)
router.get('/memos', protect, paymentTrackingController.getMemosWithToPayOrders);

// Get payment tracking grouped by receiver (1 month view)
router.get('/receiver-wise', protect, paymentTrackingController.getPaymentsByReceiver);

// Batch update payment status for receiver-wise view (across multiple memos)
router.patch('/batch-update-receiver-wise', protect, paymentTrackingController.batchUpdatePaymentStatusReceiverWise);

// Get single memo details (new endpoint)
router.get('/memo/:memoId', protect, paymentTrackingController.getMemoDetails);

// Batch update payment status (new batch endpoint)
router.patch('/batch-update', protect, paymentTrackingController.batchUpdatePaymentStatus);

// Mark payment as received
router.patch('/:parcelId/received', protect, paymentTrackingController.markPaymentReceived);

// Mark payment as To Pay (undo)
router.patch('/:parcelId/topay', protect, paymentTrackingController.markPaymentToPay);

module.exports = router;
