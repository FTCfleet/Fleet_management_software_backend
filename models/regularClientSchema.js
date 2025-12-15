const mongoose = require("mongoose");

const regularClientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    phoneNo: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    gst: {
        type: String
    },
    isSender: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('RegularClient', regularClientSchema);
