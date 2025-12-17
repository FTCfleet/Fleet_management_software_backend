const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const serviceEnquirySchema = new Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    serviceType: {
        type: String,
        required: [true, 'Service type is required'],
        enum: ['Parcel', 'Full Load', 'Part Load', 'Warehouse', 'Other'],
        default: 'Parcel'
    },
    pickupLocation: {
        type: String,
        required: [true, 'Pickup location is required'],
        trim: true
    },
    deliveryLocation: {
        type: String,
        required: [true, 'Delivery location is required'],
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    ipAddress: {
        type: String,
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const ServiceEnquiry = mongoose.model('ServiceEnquiry', serviceEnquirySchema);
module.exports = ServiceEnquiry;
