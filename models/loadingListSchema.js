const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loadingListSchema = new mongoose.Schema({

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

    createdAt: {
        type: Date,
        required: false
    },

    parcels: [
        {
            parcel: {
                type: Schema.Types.ObjectId,
                ref: 'Parcel',
                required: true
            },
            count: {
                type: Number,
                required: true,
                min: 1
            }
        }
    ],

    scannedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
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

module.exports = mongoose.model('LoadingList', loadingListSchema);