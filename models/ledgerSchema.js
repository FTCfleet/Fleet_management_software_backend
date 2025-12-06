const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ledgerSchema = new mongoose.Schema({
    ledgerId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    vehicleNo: {
        type: String,
        required: true,
        index: true
    },

    driverName: {
        type: String,
        default: 'N/A'
    },
    
    driverPhone: {
        type: String,
        default: 'N/A'
    },

    lorryFreight: {
        type: Number,
        required: true,
        default: 0
    },

    status: {
        type: String,
        enum: ['pending', 'dispatched', 'verified', 'completed'],
        default: 'pending',
        required: true,
    },

    dispatchedAt: {
        type: Date,
        required: false
    },

    deliveredAt: {
        type: Date,
        required: false
    },

    parcels: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Parcel',
            required: true
        },
    ],

    scannedBySource: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        // required: true
    },

    verifiedBySource: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
    },

    scannedByDest: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },

    verifiedByDest: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },

    sourceWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },

    destinationWarehouse: {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    }
});

module.exports = mongoose.model('Ledger', ledgerSchema);