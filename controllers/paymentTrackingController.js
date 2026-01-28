const PaymentTracking = require('../models/paymentTrackingSchema.js');
const Parcel = require('../models/parcelSchema.js');
const Ledger = require('../models/ledgerSchema.js');
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

// Get memos (ledgers) with To Pay orders
module.exports.getMemosWithToPayOrders = catchAsync(async (req, res) => {
    const { warehouseCode, role } = req.user;
    const { date } = req.query;

    // Build query for ledgers
    let ledgerQuery = {};
    
    // If user is not admin, filter by their warehouse as destination
    if (role !== 'admin' && warehouseCode) {
        ledgerQuery.destinationWarehouse = warehouseCode._id;
    }
    
    // If date filter is provided, filter by dispatchedAt
    if (date) {
        const startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(23, 59, 59, 999);
        ledgerQuery.dispatchedAt = { $gte: startDate, $lte: endDate };
    }

    // Fetch ledgers with populated parcels
    const ledgers = await Ledger.find(ledgerQuery)
        .populate({
            path: 'parcels',
            populate: [
                { path: 'sender' },
                { path: 'receiver' },
                { path: 'sourceWarehouse' },
                { path: 'destinationWarehouse' },
                { path: 'items', populate: { path: 'itemType' } }
            ]
        })
        .populate('sourceWarehouse')
        .populate('destinationWarehouse')
        .sort({ dispatchedAt: -1 });

    // Filter ledgers that have at least one delivered "To Pay" order
    const ledgersWithToPay = [];
    
    for (const ledger of ledgers) {
        // Filter to only delivered "To Pay" orders
        const deliveredToPayOrders = ledger.parcels.filter(
            parcel => parcel.payment === 'To Pay' && parcel.status === 'delivered'
        );
        
        if (deliveredToPayOrders.length > 0) {
            // Get payment tracking for these parcels
            const parcelIds = deliveredToPayOrders.map(p => p._id);
            const paymentTrackings = await PaymentTracking.find({ parcel: { $in: parcelIds } })
                .populate('receivedBy');

            // Create tracking map
            const trackingMap = {};
            paymentTrackings.forEach(pt => {
                trackingMap[pt.parcel.toString()] = pt;
            });

            // Add payment tracking to each order
            const ordersWithTracking = deliveredToPayOrders.map(parcel => {
                const tracking = trackingMap[parcel._id.toString()];
                return {
                    trackingId: parcel.trackingId,
                    status: parcel.status,
                    sender: parcel.sender,
                    receiver: parcel.receiver,
                    freight: parcel.freight,
                    hamali: parcel.hamali,
                    doorDeliveryCharge: parcel.doorDeliveryCharge,
                    isDoorDelivery: parcel.isDoorDelivery,
                    placedAt: parcel.placedAt,
                    payment: parcel.payment,
                    paymentTracking: tracking ? {
                        paymentStatus: tracking.paymentStatus,
                        receivedBy: tracking.receivedBy ? {
                            username: tracking.receivedBy.username,
                            name: tracking.receivedBy.name
                        } : null,
                        receivedAt: tracking.receivedAt
                    } : {
                        paymentStatus: 'To Pay',
                        receivedBy: null,
                        receivedAt: null
                    }
                };
            });

            ledgersWithToPay.push({
                ledgerId: ledger.ledgerId,
                dispatchedAt: ledger.dispatchedAt,
                createdAt: ledger.createdAt,
                sourceWarehouse: {
                    warehouseID: ledger.sourceWarehouse.warehouseID,
                    name: ledger.sourceWarehouse.name
                },
                destinationWarehouse: {
                    warehouseID: ledger.destinationWarehouse.warehouseID,
                    name: ledger.destinationWarehouse.name
                },
                orders: ordersWithTracking
            });
        }
    }

    res.status(200).json({
        flag: true,
        message: 'Memos fetched successfully',
        data: ledgersWithToPay
    });
});

// Batch update payment status
module.exports.batchUpdatePaymentStatus = catchAsync(async (req, res) => {
    const { orderIds, memoId } = req.body;
    const userId = req.user._id;

    if (!Array.isArray(orderIds)) {
        return res.status(400).json({
            flag: false,
            message: 'orderIds must be an array'
        });
    }

    if (!memoId) {
        return res.status(400).json({
            flag: false,
            message: 'memoId is required'
        });
    }

    // Find the ledger first to validate access
    const ledger = await Ledger.findOne({ ledgerId: memoId })
        .populate('parcels');

    if (!ledger) {
        return res.status(404).json({
            flag: false,
            message: 'Memo not found'
        });
    }

    // Check access permissions
    if (req.user.role === 'staff' && req.user.warehouseCode) {
        if (ledger.destinationWarehouse.toString() !== req.user.warehouseCode._id.toString()) {
            return res.status(403).json({
                flag: false,
                message: 'You do not have access to update payments for this memo'
            });
        }
    }

    // Get all delivered "To Pay" parcels from this memo
    const deliveredToPayParcels = ledger.parcels.filter(
        parcel => parcel.payment === 'To Pay' && parcel.status === 'delivered'
    );

    if (deliveredToPayParcels.length === 0) {
        return res.status(404).json({
            flag: false,
            message: 'No delivered To Pay orders found in this memo'
        });
    }

    const trackingIdSet = new Set(orderIds);
    const parcelIds = deliveredToPayParcels.map(p => p._id);

    // Get existing payment trackings for bulk operations
    const existingTrackings = await PaymentTracking.find({ parcel: { $in: parcelIds } });
    const trackingMap = new Map();
    existingTrackings.forEach(pt => {
        trackingMap.set(pt.parcel.toString(), pt);
    });

    // Prepare bulk operations
    const bulkOps = [];
    const newTrackings = [];

    for (const parcel of deliveredToPayParcels) {
        const shouldBeReceived = trackingIdSet.has(parcel.trackingId);
        const existingTracking = trackingMap.get(parcel._id.toString());

        if (shouldBeReceived) {
            // Mark as Payment Received
            if (existingTracking) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingTracking._id },
                        update: {
                            paymentStatus: 'Payment Received',
                            receivedBy: userId,
                            receivedAt: new Date()
                        }
                    }
                });
            } else {
                newTrackings.push({
                    parcel: parcel._id,
                    paymentStatus: 'Payment Received',
                    receivedBy: userId,
                    receivedAt: new Date()
                });
            }
        } else {
            // Mark as To Pay
            if (existingTracking) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: existingTracking._id },
                        update: {
                            paymentStatus: 'To Pay',
                            receivedBy: null,
                            receivedAt: null
                        }
                    }
                });
            } else {
                newTrackings.push({
                    parcel: parcel._id,
                    paymentStatus: 'To Pay'
                });
            }
        }
    }

    // Execute bulk operations
    if (bulkOps.length > 0) {
        await PaymentTracking.bulkWrite(bulkOps);
    }

    if (newTrackings.length > 0) {
        await PaymentTracking.insertMany(newTrackings);
    }

    res.status(200).json({
        flag: true,
        message: 'Payment status updated successfully',
        receivedBy: {
            username: req.user.username,
            name: req.user.name
        },
        receivedAt: new Date(),
        updatedCount: deliveredToPayParcels.length
    });
});

// Get single memo details with To Pay orders
module.exports.getMemoDetails = catchAsync(async (req, res) => {
    const { warehouseCode, role } = req.user;
    const { memoId } = req.params;

    // Find the ledger by ledgerId
    const ledger = await Ledger.findOne({ ledgerId: memoId })
        .populate({
            path: 'parcels',
            populate: [
                { path: 'sender' },
                { path: 'receiver' },
                { path: 'sourceWarehouse' },
                { path: 'destinationWarehouse' },
                { path: 'items', populate: { path: 'itemType' } }
            ]
        })
        .populate('sourceWarehouse')
        .populate('destinationWarehouse');

    if (!ledger) {
        return res.status(404).json({
            flag: false,
            message: 'Memo not found'
        });
    }

    // Check access permissions
    if (role !== 'admin' && warehouseCode) {
        if (ledger.destinationWarehouse._id.toString() !== warehouseCode._id.toString()) {
            return res.status(403).json({
                flag: false,
                message: 'You do not have access to this memo'
            });
        }
    }

    // Filter to only delivered "To Pay" orders
    const deliveredToPayOrders = ledger.parcels.filter(
        parcel => parcel.payment === 'To Pay' && parcel.status === 'delivered'
    );

    if (deliveredToPayOrders.length === 0) {
        return res.status(404).json({
            flag: false,
            message: 'No delivered To Pay orders found in this memo'
        });
    }

    // Get payment tracking for these parcels
    const parcelIds = deliveredToPayOrders.map(p => p._id);
    const paymentTrackings = await PaymentTracking.find({ parcel: { $in: parcelIds } })
        .populate('receivedBy');

    // Create tracking map
    const trackingMap = {};
    paymentTrackings.forEach(pt => {
        trackingMap[pt.parcel.toString()] = pt;
    });

    // Add payment tracking to each order
    const ordersWithTracking = deliveredToPayOrders.map(parcel => {
        const tracking = trackingMap[parcel._id.toString()];
        return {
            trackingId: parcel.trackingId,
            status: parcel.status,
            sender: parcel.sender,
            receiver: parcel.receiver,
            freight: parcel.freight,
            hamali: parcel.hamali,
            doorDeliveryCharge: parcel.doorDeliveryCharge,
            isDoorDelivery: parcel.isDoorDelivery,
            placedAt: parcel.placedAt,
            payment: parcel.payment,
            paymentTracking: tracking ? {
                paymentStatus: tracking.paymentStatus,
                receivedBy: tracking.receivedBy ? {
                    username: tracking.receivedBy.username,
                    name: tracking.receivedBy.name
                } : null,
                receivedAt: tracking.receivedAt
            } : {
                paymentStatus: 'To Pay',
                receivedBy: null,
                receivedAt: null
            }
        };
    });

    const memoDetails = {
        ledgerId: ledger.ledgerId,
        dispatchedAt: ledger.dispatchedAt,
        createdAt: ledger.createdAt,
        sourceWarehouse: {
            warehouseID: ledger.sourceWarehouse.warehouseID,
            name: ledger.sourceWarehouse.name
        },
        destinationWarehouse: {
            warehouseID: ledger.destinationWarehouse.warehouseID,
            name: ledger.destinationWarehouse.name
        },
        orders: ordersWithTracking
    };

    res.status(200).json({
        flag: true,
        message: 'Memo details fetched successfully',
        data: memoDetails
    });
});
