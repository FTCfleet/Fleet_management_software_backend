const PaymentTracking = require('../models/paymentTrackingSchema.js');
const Parcel = require('../models/parcelSchema.js');
const catchAsync = require('../utils/catchAsync.js');

// Get all To Pay parcels with payment tracking status
module.exports.getToPayParcels = catchAsync(async (req, res) => {
    const { warehouseCode, role } = req.user;
    const { date } = req.query;

    // Build query for parcels with "To Pay" payment
    let parcelQuery = { 
        payment: 'To Pay',
        status: 'delivered'
    };
    
    // If user is not admin, filter by their warehouse as destination
    if (role !== 'admin' && warehouseCode) {
        parcelQuery.destinationWarehouse = warehouseCode._id;
    }
    
    // If date filter is provided
    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        parcelQuery.placedAt = { $gte: startDate, $lte: endDate };
    }

    // Fetch parcels
    const parcels = await Parcel.find(parcelQuery)
        .populate('sender')
        .populate('receiver')
        .populate('sourceWarehouse')
        .populate('destinationWarehouse')
        .populate('items')
        .populate({ path: 'items', populate: { path: 'itemType' } })
        .sort({ placedAt: -1 });

    // Fetch payment tracking for these parcels
    const parcelIds = parcels.map(p => p._id);
    const paymentTrackings = await PaymentTracking.find({ parcel: { $in: parcelIds } })
        .populate('receivedBy');

    // Create a map for quick lookup
    const trackingMap = {};
    paymentTrackings.forEach(pt => {
        trackingMap[pt.parcel.toString()] = pt;
    });

    // Combine data
    const result = parcels.map(parcel => {
        const tracking = trackingMap[parcel._id.toString()];
        return {
            ...parcel.toObject(),
            paymentTracking: tracking || { paymentStatus: 'To Pay' }
        };
    });

    res.status(200).json({
        message: 'To Pay parcels fetched successfully',
        data: result,
        flag: true
    });
});

// Mark payment as received
module.exports.markPaymentReceived = catchAsync(async (req, res) => {
    const { parcelId } = req.params;
    const userId = req.user._id;

    // Check if parcel exists and is "To Pay" - parcelId could be trackingId or _id
    let parcel = await Parcel.findOne({ trackingId: parcelId });
    if (!parcel) {
        parcel = await Parcel.findById(parcelId);
    }
    
    if (!parcel) {
        return res.status(404).json({
            message: 'Parcel not found',
            flag: false
        });
    }

    if (parcel.payment !== 'To Pay') {
        return res.status(400).json({
            message: 'Parcel payment is not "To Pay"',
            flag: false
        });
    }

    // Check if user has access (admin or staff at destination warehouse)
    if (req.user.role === 'staff' && req.user.warehouseCode) {
        if (parcel.destinationWarehouse.toString() !== req.user.warehouseCode._id.toString()) {
            return res.status(403).json({
                message: 'You do not have access to mark this payment',
                flag: false
            });
        }
    }

    // Update or create payment tracking
    let paymentTracking = await PaymentTracking.findOne({ parcel: parcel._id });
    
    if (paymentTracking) {
        paymentTracking.paymentStatus = 'Payment Received';
        paymentTracking.receivedBy = userId;
        paymentTracking.receivedAt = new Date();
        await paymentTracking.save();
    } else {
        paymentTracking = await PaymentTracking.create({
            parcel: parcel._id,
            paymentStatus: 'Payment Received',
            receivedBy: userId,
            receivedAt: new Date()
        });
    }

    // Populate receivedBy before sending response
    await paymentTracking.populate('receivedBy');

    res.status(200).json({
        message: 'Payment marked as received',
        data: paymentTracking,
        flag: true
    });
});

// Mark payment as To Pay (undo)
module.exports.markPaymentToPay = catchAsync(async (req, res) => {
    const { parcelId } = req.params;

    // Check if parcel exists - parcelId could be trackingId or _id
    let parcel = await Parcel.findOne({ trackingId: parcelId });
    if (!parcel) {
        parcel = await Parcel.findById(parcelId);
    }
    
    if (!parcel) {
        return res.status(404).json({
            message: 'Parcel not found',
            flag: false
        });
    }

    if (parcel.payment !== 'To Pay') {
        return res.status(400).json({
            message: 'Parcel payment is not "To Pay"',
            flag: false
        });
    }

    // Check if user has access
    if (req.user.role === 'staff' && req.user.warehouseCode) {
        if (parcel.destinationWarehouse.toString() !== req.user.warehouseCode._id.toString()) {
            return res.status(403).json({
                message: 'You do not have access to modify this payment',
                flag: false
            });
        }
    }

    // Update or create payment tracking
    let paymentTracking = await PaymentTracking.findOne({ parcel: parcel._id });
    
    if (paymentTracking) {
        paymentTracking.paymentStatus = 'To Pay';
        paymentTracking.receivedBy = null;
        paymentTracking.receivedAt = null;
        await paymentTracking.save();
    } else {
        paymentTracking = await PaymentTracking.create({
            parcel: parcel._id,
            paymentStatus: 'To Pay'
        });
    }

    res.status(200).json({
        message: 'Payment marked as To Pay',
        data: paymentTracking,
        flag: true
    });
});
