const mongoose = require('mongoose');

const itemTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    }
});

module.exports = mongoose.model('ItemType', itemTypeSchema);
