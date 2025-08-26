const Parcel = require("../models/parcelSchema.js");
const Warehouse= require("../models/warehouseSchema.js");

module.exports.fetchAllWarehouse= async(req, res)=>{
    try{
        const allWarehouses= await Warehouse.find();
        allWarehouses.sort((a, b) => a.order - b.order);
        return res.status(200).json({message: "Successfully fetched all warehouses", flag:true, body: allWarehouses});
    }catch(err){
        return res.status(500).json({message: "Failed to fetch all warehouses", flag:false, error: err.message});
    }
}