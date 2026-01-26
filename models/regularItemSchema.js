const mongoose= require("mongoose");

const regularItemSchema= new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    itemType:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ItemType',
        required: true
    },
    freight:{
        type: Number,
        required: false,
        default: null
    },
    hamali:{
        type: Number,
        required: false,
        default: null
    }
});

module.exports= mongoose.model('RegularItem', regularItemSchema);
