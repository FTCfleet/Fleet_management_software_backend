const mongoose = require('mongoose');

const warehouseSchema= new mongoose.Schema({
    name:{
        type: String,
        required: true,
    },
    address:{
        type: String,
        required: true
    },
    phoneNo:{
        type: String,
        required: true
    },
    warehouseID:{
        type: String,
        required: true
    },
    isSource:{
        type: Boolean,
        required: true
    },
    order:{
        type: Number,
        required: true
    }
});

module.exports= mongoose.model('Warehouse', warehouseSchema);