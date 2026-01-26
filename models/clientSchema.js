const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false
    },

    phoneNo: {
        type: String,
        required: false
    },

    address: {
        type: String,
        required: false
    },

    gst:{
        type: String,
        required: false
    },

    role: {
        type: String,
        enum: ['sender', 'receiver'],
        required: true
    },
});

// Index for name search
clientSchema.index({ name: 1 });


module.exports = mongoose.model('Client', clientSchema);