const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentTrackingSchema = new mongoose.Schema({
    parcel: {
        type: Schema.Types.ObjectId,
        ref: 'Parcel',
        required: true,
        unique: true
    },
    
    paymentStatus: {
        type: String,
        enum: ['To Pay', 'Payment Received'],
        default: 'To Pay',
        required: true
    },
    
    receivedBy: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
        required: false
    },
    
    receivedAt: {
        type: Date,
        required: false
    },
    
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
});

// Index for efficient queries
paymentTrackingSchema.index({ paymentStatus: 1 });
paymentTrackingSchema.index({ createdAt: -1 });

const PaymentTracking = mongoose.model('PaymentTracking', paymentTrackingSchema);
module.exports = PaymentTracking;
