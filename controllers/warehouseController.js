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

module.exports.editWarehouse = async (req, res) => {
    try {
        const { id } = req.params; // expects warehouseID in params
        const updates = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Warehouse ID is required', flag: false });
        }

        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Update data is required', flag: false });
        }

        const updatedWarehouse = await Warehouse.findOneAndUpdate(
            { warehouseID: id },
            { $set: updates },
            { new: true }
        );

        if (!updatedWarehouse) {
            return res.status(201).json({ message: `No warehouse found with ID ${id}`, flag: false });
        }

        return res.status(200).json({ message: 'Successfully updated warehouse', body: updatedWarehouse, flag: true });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update warehouse', error: err.message, flag: false });
    }
}
