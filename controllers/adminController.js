const Driver = require("../models/driverSchema.js");
const Employee = require("../models/employeeSchema.js");
const Warehouse = require("../models/warehouseSchema.js");
const Item = require("../models/itemSchema.js");
const Parcel = require("../models/parcelSchema.js");
const Ledger = require("../models/ledgerSchema.js");
const Client = require("../models/clientSchema.js");
const generateUniqueId = require("../utils/uniqueIdGenerator.js");

//
module.exports.fetchAllEmployees = async (req, res) => {
    try {
        const allEmployees = await Employee.find().select('-password').populate('warehouseCode');

        if (allEmployees.length === 0) {
            return res.status(201).json({ message: "No employees", body: {} ,flag:false});
        }

        return res.status(200).json({ message: "Successfully fetched all employees", body: allEmployees,flag:true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch all Employees", error: err.message ,flag:false});
    }
}

//
module.exports.fetchAllDrivers = async (req, res) => {
    try {
        const allDrivers = await Driver.find();

        if (allDrivers.length === 0) {
            return res.status(201).json({ message: "No Drivers", body: {}, flag:false });
        }

        return res.status(200).send({ message: "Successfully fetched all Drivers", body: allDrivers, flag:true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch all Drivers", error: err.message ,flag:false});
    }
}

//
module.exports.addDriver = async (req, res) => {
    try {
        const newDriver = new Driver({ ...req.body });
        await newDriver.save();
        return res.status(200).json({ message: "Successfully created a driver", body: newDriver ,flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to create a new driver", error:err.message, flag:false });
    }
}

//
module.exports.updateDriver = async (req, res) => {
    try {
        const { vehicleNo, updates } = req.body;
        const updatedDriver = await Driver.findOneAndUpdate(
            { vehicleNo },
            { $set: updates },
            { new: true }
        );

        if (!updatedDriver) {
            return res.status(201).json({ message: `No driver found with vehicle number ${vehicleNo}`, flag:false });
        }

        return res.status(200).json({ message: "Successfully updated driver", body: updatedDriver, flag:true });

    } catch (err) {
        return res.status(500).json({ message: "Failed to update driver", error: err.message, flag:false });
    }
}

//
module.exports.deleteDriver = async (req, res) => {
    try {
        const { vehicleNo } = req.body;
        const driver = await Driver.findOne({ vehicleNo });

        if (!driver) {
            return res.status(201).json({ message: `No driver found with vehicle number ${vehicleNo}` , flag:false});
        }

        await Driver.deleteOne({ _id: driver._id });

        return res.status(200).json({ message: "Successfully deleted driver", body: driver , flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete driver", error: err.message , flag:false});
    }
}

//
module.exports.updateEmployee = async (req, res) => {
    try {
        const { username, updates } = req.body;

        if(updates.warehouseCode){
            const warehouse= await Warehouse.findOne({warehouseID: updates.warehouseCode});
            updates.warehouseCode= warehouse._id;
        }

        const updatedEmployee = await Employee.findOneAndUpdate(
            { username },
            { $set: updates },
            { new: true }
        );

        if (!updatedEmployee) {
            return res.status(201).json({ message: `No Employee found with username: ${username}`, flag:false });
        }

        return res.status(200).json({ message: "Successfully updated employee", body: updatedEmployee , flag:true});

    } catch (err) {
        return res.status(500).json({ message: "Failed to update employee", error: err.message , flag:false});
    }
}

//
module.exports.deleteEmployee = async (req, res) => {
    try {
        const { username } = req.body;
        const employee = await Employee.findOne({ username });

        if (!employee) {
            return res.status(201).json({ message: `No employee found with username: ${username}` , flag:false});
        }

        await Employee.deleteOne({ username });

        return res.status(200).json({ message: "Successfully deleted employee", body: employee , flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete employee", error: err.message , flag:false});
    }
}

//
module.exports.fetchAllWarehouses = async (req, res) => {
    try {
        const allWarehouses = await Warehouse.find();

        if (allWarehouses.length === 0) {
            return res.status(201).json({ message: "No Warehouses", body: {} , flag:false});
        }

        return res.status(200).json({ message: "Successfully fetched all Warehouses", body: allWarehouses, flag:true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch all Warehouses", error: err.message , flag:false});
    }
}

//
module.exports.addWarehouse = async (req, res) => {
    try {
        const warehouse = new Warehouse({ ...req.body });
        await warehouse.save();
        return res.status(200).json({ message: "Successfully added a warehouse", body: warehouse ,flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to add a new warehouse", err ,flag:false});
    }
}

//
module.exports.updateWarehouse = async (req, res) => {
    try {
        const { warehouseID, updates } = req.body;
        const updatedWarehouse = await Warehouse.findOneAndUpdate(
            { warehouseID },
            { $set: updates },
            { new: true }
        );

        if (!updatedWarehouse) {
            return res.status(201).json({ message: `No warehouse found with ID ${warehouseID}` , flag:false});
        }

        return res.status(200).json({ message: "Successfully updated warehouse", body: updatedWarehouse , flag:true});

    } catch (err) {
        return res.status(500).json({ message: "Failed to update warehouse", error: err.message, flag:false });
    }
}

//
module.exports.deleteWarehouse = async (req, res) => {
    try {
        const { warehouseID } = req.body;
        const warehouse = await Warehouse.findOne({ warehouseID });

        if (!warehouse) {
            return res.status(201).json({ message: `No warehouse found with Code: ${warehouseID}` , flag:false});
        }

        await Warehouse.deleteOne({ warehouseID });

        return res.status(200).json({ message: "Successfully deleted warehouse", body: warehouse , flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete warehouse", error: err.message , flag:false});
    }
}

//
module.exports.deleteParcel = async (req, res) => {
    try {
        const { trackingId } = req.body;
        const parcel = await Parcel.findOne({ trackingId });

        if (!parcel) {
            return res.status(400).json({ flag: false, message: `No parcel found with ID: ${trackingId}` , flag:false});
        }

        if (parcel.ledgerId) {
            const parcelId = await Parcel.findOne({trackingId});
            console.log(parcelId);
            const ledger = await Ledger.findOneAndUpdate(
                { ledgerId: parcel.ledgerId },
                { $pull: { parcels: parcelId._id } },
                { new: true }
            );
            await ledger.save();
        }
        
        const itemIds = parcel.items;
        
        for (const id of itemIds) {
            const item = await Item.findById(id);
            await Item.findByIdAndDelete(item._id);
        }

        await Client.findByIdAndDelete(parcel.sender);
        await Client.findByIdAndDelete(parcel.receiver);

        await Parcel.deleteOne({ trackingId });

        return res.status(200).json({ message: "Successfully deleted parcel", body: parcel, flag: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete parcel", error: err.message, flag: false });
    }
}

//
module.exports.deleteLedger = async (req, res) => {
    try {
        const { ledgerId } = req.body;
        const ledger = await Ledger.findOne({ ledgerId });

        if (!ledger) {
            return res.status(404).json({ message: `No ledger found with ID: ${ledgerId}` , flag:false});
        }

        const parcelIds = ledger.parcels;
        for (const id of parcelIds) {
            const parcel = await Parcel.findById(id);
            delete parcel.ledgerId;
            parcel.ledgerId = undefined;
            parcel.status = 'arrived';
            await parcel.save();
        }
        await Ledger.deleteOne({ ledgerId });

        return res.status(200).json({ message: "Successfully deleted ledger", body: ledger , flag:true});
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete ledger", error: err.message , flag:false});
    }
}