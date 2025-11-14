const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parcelSchema = new mongoose.Schema({
    trackingId:{
        type: String,
        required: true,
        unique: true
    },

    ledgerId:{
        type: Schema.Types.ObjectId,
        ref: 'Ledger',
    },

    items: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Item'
        },
    ],

    sender: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
    },

    receiver: {
        type: Schema.Types.ObjectId,
        ref: 'Client',
    },

    sourceWarehouse:{
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    
    destinationWarehouse:{
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
        required: false
    },
    
    status: {
        type: String,
        enum:['arrived', 'dispatched', 'delivered'],
        default: 'arrived',
        required: true
    },

    charges: {
        type: Number,
        required: true,
        default: 0
    },

    hamali: {
        type: Number,
        required: true,
        default: 0
    },

    freight: {
        type: Number,
        required: true,
        default: 0
    },

    payment:{
        type: String,
        enum: ['To Pay', 'Paid'],
        required: true
    },

    isDoorDelivery:{
        type: Boolean,
        default: false
    },

    addedBy:{
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: true
    },

    lastModifiedBy:{
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },

    lastModifiedAt:{
        type: Date,
        // default: Date.now,
        required: false
    },

    placedAt:{
        type: Date,
        // default: Date.now,
        required: true
    },

    doorDeliveryCharge: {
        type: Number,
        required: true,
        default: 0
    }
});

const Parcel = mongoose.model('Parcel', parcelSchema);
module.exports = Parcel;