const Parcel = require("../models/parcelSchema.js");
const Warehouse = require("../models/warehouseSchema.js");
const Employee = require("../models/employeeSchema.js");

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
        console.log(id);
        if (!id) {
            return res.status(400).json({ message: 'Warehouse ID is required', flag: false });
        }

        const newWarehouse = await Warehouse.findOne({ warehouseID: id });
        if (!newWarehouse) {
            return res.status(201).json({ message: `No warehouse found with ID ${id}`, flag: false });
        }
        const user = await Employee.findById(req.user._id); // Assuming req.user is populated by authentication middleware
        user.warehouseCode = newWarehouse._id;
        await user.save();

        return res.status(200).json({ message: 'Successfully updated warehouse', body: newWarehouse, flag: true });
    } catch (err) {
        return res.status(500).json({ message: 'Failed to update warehouse', error: err.message, flag: false });
    }
}
