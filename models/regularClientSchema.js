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
    },
    items: [{
        itemDetails: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RegularItem',
        },
        hamali: {
            type: Number,
        },
        freight: {
            type: Number,
        },
        statisticalCharges: {
            type: Number,
        }
    }]
});

module.exports = mongoose.model('RegularClient', regularClientSchema);
