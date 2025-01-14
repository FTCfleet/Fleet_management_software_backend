const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ledgerSchema = new mongoose.Schema({
    vehicleNo: {
        type: String,
        required: true,
        index: true
    },

    charges: {
        type: Number,
        required: true
    },

    isComplete: {
        type: Boolean,
        default: false,
        required: true
    },

    dispatchedAt: {
        type: Date,
        required: true
    },

    itemIds: [{
        type: String
            // type: Schema.Types.ObjectId,
            // ref: 'Item'
    }]
});

module.exports = mongoose.model('Ledger', ledgerSchema);