const Driver = require("../models/driverSchema.js");
const Employee = require("../models/employeeSchema.js");
const Warehouse = require("../models/warehouseSchema.js");
const Item = require("../models/itemSchema.js");
const Parcel = require("../models/parcelSchema.js");
const Ledger = require("../models/ledgerSchema.js");
const Client = require("../models/clientSchema.js");
const RegularClient= require("../models/regularClientSchema.js");
const RegularItem= require("../models/regularItemSchema.js");

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
        allWarehouses.sort((a, b) => a.order - b.order);
        return res.status(200).json({ message: "Successfully fetched all Warehouses", body: allWarehouses, flag:true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch all Warehouses", error: err.message , flag:false});
    }
}

//
module.exports.addWarehouse = async (req, res) => {
    try {
        const warehouse = new Warehouse({ ...req.body });
        warehouse.order= (await Warehouse.countDocuments()) + 1;
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
        const allWarehouses= await Warehouse.find();
        let order=1;
        allWarehouses.sort((a, b) => a.order - b.order);
        for(let wh of allWarehouses){
            wh.order= order;
            order++;
            await wh.save();
        }

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
            // console.log(parcelId);
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

module.exports.getAllRegularItems= async(req, res)=>{
    try{
        const allItems= await RegularItem.find().sort({name: 1});

        return res.status(200).json({ message: "Successfully fetched all regular items", body: allItems, flag: true});
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch all regular items", error: err.message, flag: false});
    }
}

module.exports.addNewRegularItems= async(req, res)=>{
    try{
        const { items }= req.body;
        for(let item of items){
            const newitem= new RegularItem({name: item.name +  ` (${item.type})`, type: item.type, freight: item.freight, hamali: item.hamali});
            await newitem.save();
        }

        return res.status(201).json({ message: "Successfully added all regular items", flag: true });
    }catch(err){
        return res.status(500).json({ message: "Failed to add new regular items", error: err.message, flag: false });
    }
}

module.exports.editRegularItems= async(req, res)=>{
    try{
        const { items }= req.body;
        for(let item of items){
            const existingItem = await RegularItem.findById(item._id);
            // existingItem.name = item.name;
            existingItem.type = item.type;
            existingItem.freight = item.freight;
            existingItem.hamali = item.hamali;
            // const newitem = await RegularItem.findByIdAndUpdate(item._id, existingItem, { new: true });
            await existingItem.save();
        }

        return res.status(201).json({ message: "Successfully added all regular items", flag: true });
    }catch(err){
        return res.status(500).json({ message: "Failed to add new regular items", error: err.message, flag: false });
    }
}

module.exports.deleteRegularItem = async(req, res) => {
    try {
        const {itemId} = req.body;

        const item = await RegularItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ message: `No Regular Item found with ID: ${itemId}`, flag: false });
        }

        // Remove the item from all regular clients' items array
        await RegularClient.updateMany(
            { 'items.itemDetails': itemId },
            { $pull: { items: { itemDetails: itemId } } }
        );
        
        await RegularItem.findByIdAndDelete(itemId);
        
        return res.status(200).json({message: "Successfully deleted regular item and removed from all clients", flag: true});
    } catch(err) {
        return res.status(500).json({ message: "Failed to delete regular item", error: err.message, flag: false});
    }
}

//edit client
module.exports.getAllRegularClients= async(req, res)=>{
    try{
        const allClients= await RegularClient.find().sort({name: 1}).populate('items.itemDetails');

        return res.status(200).json({message: "Successfully fetched all regular clients", body: allClients, flag:true});
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch all regular items", error: err.message, flag: false});
    }
}

module.exports.addNewRegularClient= async(req, res)=>{
    try{
        const {name, phoneNo, address="NA", gst, items= []}= req.body;
        const client= new RegularClient({name, phoneNo, address, gst, items});
        
        await client.save();
    
        return res.status(200).json({ message: "Successfully added a regular client", body: client, flag: true });
    }catch(err){
        return res.status(500).json({ message: "Failed to create a new regular client", error: err.message, flag: false});
    }
}

module.exports.editRegularClient= async(req, res)=>{
    try{
        const { id, updates }= req.body;

        const client= await RegularClient.findByIdAndUpdate(id, {$set: updates});
        if(!client){
            return res.status(404).json({message: "No client found with given Id", flag: false});
        }
        return res.status(200).json({ message: "Successfully edited client details", flag: true, body: client });

    }catch(err){
        return res.status(500).json({message: "Failed to update client details", error: err.message, flag: false});
    }
}

module.exports.deleteRegularClient= async(req, res)=>{
    try{
        const {id}= req.body;

        const client = await RegularClient.findById(id);

        if (!client) {
            return res.status(404).json({ message: `No Regular Client found with ID: ${id}`, flag: false});
        }

        await RegularClient.findByIdAndDelete(id);

        return res.status(200).json({message: "Successfully deleted a regular client", flag:true});
    }catch(err){
        return res.status(500).json({ message: "Failed to delete a regular client", error: err.message, flag: false});
    }
}

module.exports.getItemForRegularClient= async(req, res)=>{
    try{
        const {id}= req.params;

        const client= await RegularClient.findById(id).populate('items.itemDetails');

        if(!client){
            return res.status(404).json({message: "No client found with given Id", flag: false});
        }
        return res.status(200).json({ message: "Successfully fetched items for regular client", flag: true, body: client.items });

    }catch(err){
        return res.status(500).json({message: "Failed to fetch items for regular client", error: err.message, flag: false});
    }
}

module.exports.delReg= async(req, res)=>{
    try{
        const all= await RegularClient.find();
        for(let client of all){
            client.items= [];
            client.save();
        }
        return res.status(200).json({ message: "Successfully deleted all regular clients' items", body: all, flag: true });
    }catch(err){
        return res.status(500).json({ message: "Failed to delete regular client", error: err.message, flag: false });
    }
}
