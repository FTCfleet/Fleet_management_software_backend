const Driver = require("../models/driverSchema.js");
const Employee = require("../models/employeeSchema.js");
const Warehouse = require("../models/warehouseSchema.js");
const Item = require("../models/itemSchema.js");
const Parcel = require("../models/parcelSchema.js");
const Ledger = require("../models/ledgerSchema.js");
const Client = require("../models/clientSchema.js");
const RegularClient= require("../models/regularClientSchema.js");
const RegularItem= require("../models/regularItemSchema.js");
const ItemType = require("../models/itemTypeSchema.js");

const toBoolean = (value) => {
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        return normalized === 'true' || normalized === '1';
    }
    return Boolean(value);
};

const REGULAR_ITEM_SUFFIX_REGEX = /\s*\(([^()]+)\)$/;
const extractRegularItemBaseName = (name = '') => name.replace(REGULAR_ITEM_SUFFIX_REGEX, '').trim();
const buildRegularItemName = (baseName, type) => `${baseName.trim()} (${type})`;
const ITEM_TYPE_COLLATION = { locale: 'en', strength: 2 };

const normalizeItemTypeName = (input) => {
    if (typeof input === 'string') {
        return input.trim();
    }
    if (input && typeof input === 'object' && typeof input.name === 'string') {
        return input.name.trim();
    }
    return '';
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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
            return res.status(401).json({ flag: false, message: `No parcel found with ID: ${trackingId}` , flag:false});
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
        const { page = 1, name } = req.query || {};
        const PAGE_SIZE = 200;
        const parsedPage = parseInt(page, 10);
        const pageNumber = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        const filters = {};
        if (typeof name === 'string' && name.trim()) {
            filters.name = { $regex: `^${escapeRegex(name.trim())}`, $options: 'i' };
        }

        const skip = (pageNumber - 1) * PAGE_SIZE;

        const [items, totalItems] = await Promise.all([
            RegularItem.find(filters)
                .sort({ name: 1 })
                .skip(skip)
                .limit(PAGE_SIZE)
                .populate('itemType'),
            RegularItem.countDocuments(filters)
        ]);

        return res.status(200).json({
            message: "Successfully fetched all regular items",
            body: {
                items,
                page: pageNumber,
                pageSize: PAGE_SIZE,
                totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / PAGE_SIZE),
                totalItems
            },
            flag: true
        });
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch all regular items", error: err.message, flag: false});
    }
}

module.exports.getRegularItemDirectory = async (req, res) => {
    try{
        const items = await RegularItem.find()
            .sort({ name: 1 })
            .populate('itemType');

        return res.status(200).json({
            message: "Successfully fetched regular item directory",
            body: items,
            flag: true
        });
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch regular item directory", error: err.message, flag: false});
    }
};




module.exports.addNewRegularItems= async(req, res)=>{
    try{
        const { items }= req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(401).json({ message: "No items provided for creation", flag: false });
        }

        const combinationGuard = new Set();
        const preparedItems = [];
        const typeCache = new Map();

        for (const item of items){
            if (!item || typeof item !== 'object') {
                return res.status(401).json({ message: "Each item must be an object", flag: false });
            }

            const rawName = typeof item.name === 'string' ? item.name.trim() : '';
            if (!rawName) {
                return res.status(402).json({ message: "Regular item name is required", flag: false });
            }

            const baseName = extractRegularItemBaseName(rawName);
            if (!baseName) {
                return res.status(403).json({ message: "Regular item name cannot be empty", flag: false });
            }
            const typeName = normalizeItemTypeName(item.type);
            if (!typeName) {
                return res.status(404).json({ message: "Regular item type name is required", flag: false });
            }

            const cacheKey = typeName.toLowerCase();
            let typeRecord = typeCache.get(cacheKey);
            if (!typeRecord) {
                typeRecord = await ItemType.findOne({ name: typeName }).collation(ITEM_TYPE_COLLATION);
                if (!typeRecord) {
                    return res.status(405).json({ message: `Item type "${typeName}" does not exist`, flag: false });
                }
                typeCache.set(cacheKey, typeRecord);
            }

            const finalName = buildRegularItemName(baseName, typeRecord.name);
            const combinationKey = `${baseName.toLowerCase()}|${typeRecord._id.toString()}`;
            if (combinationGuard.has(combinationKey)) {
                return res.status(409).json({ message: "Duplicate regular item in request payload", flag: false });
            }
            combinationGuard.add(combinationKey);

            preparedItems.push({
                name: finalName,
                itemType: typeRecord._id,
                freight: item.freight,
                hamali: item.hamali
            });
        }

        const lookupFilters = preparedItems.map(({ name, itemType }) => ({ name, itemType }));
        if (lookupFilters.length > 0) {
            const conflicts = await RegularItem.find({ $or: lookupFilters }).collation(ITEM_TYPE_COLLATION);
            if (conflicts.length > 0) {
                return res.status(406).json({ message: `Regular item "${conflicts[0].name}" already exists`, flag: false });
            }
        }

        const createdItems = await RegularItem.insertMany(preparedItems);
        await RegularItem.populate(createdItems, { path: 'itemType' });

        return res.status(201).json({ message: "Successfully added all regular items", flag: true, body: createdItems });
    }catch(err){
        if (err.code === 11000){
            return res.status(407).json({ message: "Regular item already exists", flag: false });
        }
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




module.exports.getAllItemTypes = async (req, res) => {
    try {
        const itemTypes = await ItemType.find().sort({ name: 1 });
        return res.status(200).json({ message: "Successfully fetched all item types", body: itemTypes, flag: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch item types", error: err.message, flag: false });
    }
};

module.exports.addItemType = async (req, res) => {
    try {
        const { name } = req.body;
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!trimmedName) {
            return res.status(401).json({ message: "Item type name is required", flag: false });
        }

        const itemType = new ItemType({ name: trimmedName.toUpperCase() });
        await itemType.save();

        return res.status(201).json({ message: "Successfully added item type", body: itemType, flag: true });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Item type already exists", flag: false });
        }
        return res.status(500).json({ message: "Failed to add item type", error: err.message, flag: false });
    }
};

module.exports.editItemType = async (req, res) => {
    try {
        const { id, name } = req.body;
        const trimmedName = typeof name === 'string' ? name.trim() : '';

        if (!id) {
            return res.status(400).json({ message: "Item type id is required", flag: false });
        }

        if (!trimmedName) {
            return res.status(400).json({ message: "Item type name is required", flag: false });
        }

        const updatedItemType = await ItemType.findByIdAndUpdate(id, { name: trimmedName.toUpperCase() }, { new: true, runValidators: true });

        if (!updatedItemType) {
            return res.status(404).json({ message: `No item type found with ID: ${id}`, flag: false });
        }

        return res.status(200).json({ message: "Successfully updated item type", body: updatedItemType, flag: true });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: "Item type already exists", flag: false });
        }
        return res.status(500).json({ message: "Failed to update item type", error: err.message, flag: false });
    }
};

module.exports.deleteItemType = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: "Item type id is required", flag: false });
        }

        const deletedItemType = await ItemType.findByIdAndDelete(id);

        if (!deletedItemType) {
            return res.status(404).json({ message: `No item type found with ID: ${id}`, flag: false });
        }

        return res.status(200).json({ message: "Successfully deleted item type", body: deletedItemType, flag: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to delete item type", error: err.message, flag: false });
    }
};

module.exports.editRegularItems= async(req, res)=>{
    try{
        const { items }= req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(401).json({ message: "No items provided for update", flag: false });
        }

        const updatesToApply = [];
        const combinationGuard = new Set();
        const typeCache = new Map();

        for (const item of items){
            if (!item || !item._id) {
                return res.status(401).json({ message: "Item id is required for update", flag: false });
            }

            const existingItem = await RegularItem.findById(item._id).populate('itemType');
            if (!existingItem){
                return res.status(404).json({ message: `No Regular Item found with ID: ${item._id}`, flag: false });
            }

            let nextTypeRecord = existingItem.itemType;
            if (Object.prototype.hasOwnProperty.call(item, 'type')) {
                const typeName = normalizeItemTypeName(item.type);
                if (!typeName) {
                    return res.status(401).json({ message: "Regular item type name is required", flag: false });
                }

                const cacheKey = typeName.toLowerCase();
                let cachedType = typeCache.get(cacheKey);
                if (!cachedType) {
                    cachedType = await ItemType.findOne({ name: typeName }).collation(ITEM_TYPE_COLLATION);
                    if (!cachedType) {
                        return res.status(401).json({ message: `Item type "${typeName}" does not exist`, flag: false });
                    }
                    typeCache.set(cacheKey, cachedType);
                }
                nextTypeRecord = cachedType;
            }

            if (!nextTypeRecord) {
                return res.status(401).json({ message: "Regular item type is required", flag: false });
            }

            let resolvedType = nextTypeRecord;
            if (resolvedType && !resolvedType.name) {
                resolvedType = await ItemType.findById(resolvedType);
            }

            if (!resolvedType || !resolvedType.name) {
                return res.status(401).json({ message: "Regular item type is invalid", flag: false });
            }

            let baseName;
            if (typeof item.name === 'string') {
                const trimmedName = item.name.trim();
                if (!trimmedName) {
                    return res.status(401).json({ message: "Regular item name cannot be empty", flag: false });
                }
                baseName = extractRegularItemBaseName(trimmedName);
            } else {
                baseName = extractRegularItemBaseName(existingItem.name);
            }

            if (!baseName) {
                return res.status(401).json({ message: "Regular item name cannot be empty", flag: false });
            }

            const finalName = buildRegularItemName(baseName, resolvedType.name);
            const combinationKey = `${baseName.toLowerCase()}|${resolvedType._id.toString()}`;
            if (combinationGuard.has(combinationKey)) {
                return res.status(409).json({ message: "Duplicate regular item in request payload", flag: false });
            }
            combinationGuard.add(combinationKey);

            const duplicate = await RegularItem.findOne({ _id: { $ne: existingItem._id }, name: finalName, itemType: resolvedType._id }).collation(ITEM_TYPE_COLLATION);
            if (duplicate) {
                return res.status(409).json({ message: `Regular item "${finalName}" already exists`, flag: false });
            }

            const setPayload = { name: finalName, itemType: resolvedType._id };
            if (Object.prototype.hasOwnProperty.call(item, 'freight')){
                setPayload.freight = item.freight;
            }
            if (Object.prototype.hasOwnProperty.call(item, 'hamali')){
                setPayload.hamali = item.hamali;
            }

            updatesToApply.push({ id: existingItem._id, set: setPayload });
        }

        for (const { id, set } of updatesToApply){
            await RegularItem.findByIdAndUpdate(id, { $set: set });
        }

        return res.status(200).json({ message: "Successfully updated regular items", flag: true });
    }catch(err){
        if (err.code === 11000){
            return res.status(409).json({ message: "Regular item name already exists", flag: false });
        }
        return res.status(500).json({ message: "Failed to update regular items", error: err.message, flag: false });
    }
}

//edit client
module.exports.getAllRegularClients= async(req, res)=>{
    try{
        const { page = 1, name, type = 'all' } = req.query || {};
        const PAGE_SIZE = 200;
        const parsedPage = parseInt(page, 10);
        const pageNumber = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

        const filters = {};
        if (typeof name === 'string' && name.trim()) {
            filters.name = { $regex: `^${escapeRegex(name.trim())}`, $options: 'i' };
        }

        const normalizedType = typeof type === 'string' ? type.trim().toLowerCase() : 'all';
        if (normalizedType === 'sender') {
            filters.isSender = true;
        } else if (normalizedType === 'receiver') {
            filters.isSender = false;
        }

        const skip = (pageNumber - 1) * PAGE_SIZE;

        const [clients, totalClients] = await Promise.all([
            RegularClient.find(filters)
                .sort({ name: 1 })
                .skip(skip)
                .limit(PAGE_SIZE)
                .select('-items'),
            RegularClient.countDocuments(filters)
        ]);

        return res.status(200).json({
            message: "Successfully fetched all regular clients",
            body: {
                clients,
                page: pageNumber,
                pageSize: PAGE_SIZE,
                totalPages: totalClients === 0 ? 0 : Math.ceil(totalClients / PAGE_SIZE),
                totalClients
            },
            flag:true
        });
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch all regular clients", error: err.message, flag: false});
    }
}

module.exports.getRegularClientDirectory = async (req, res) => {
    try{
        const clients = await RegularClient.find()
            .sort({ name: 1 })
            .select('name phoneNo address gst isSender');

        return res.status(200).json({
            message: "Successfully fetched regular client directory",
            body: clients,
            flag: true
        });
    }catch(err){
        return res.status(500).json({ message: "Failed to fetch regular client directory", error: err.message, flag: false});
    }
};

module.exports.addNewRegularClient= async(req, res)=>{
    try{
        const {name, phoneNo, address="NA", gst, items= [], isSender = false}= req.body;
        const client= new RegularClient({name, phoneNo, address, gst, items, isSender: toBoolean(isSender)});
        
        await client.save();
    
        return res.status(200).json({ message: "Successfully added a regular client", body: client, flag: true });
    }catch(err){
        return res.status(500).json({ message: "Failed to create a new regular client", error: err.message, flag: false});
    }
}

module.exports.editRegularClient= async(req, res)=>{
    try{
        const { id, updates }= req.body;

        if (!id || !updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
            return res.status(401).json({message: "Client id and updates are required", flag: false});
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'isSender')) {
            updates.isSender = toBoolean(updates.isSender);
        }

        if (typeof updates.name === 'string') {
            const trimmedName = updates.name.trim();
            if (!trimmedName) {
                return res.status(401).json({message: "Client name cannot be empty", flag: false});
            }
            updates.name = trimmedName;
        }

        const client= await RegularClient.findByIdAndUpdate(
            id,
            {$set: updates},
            { new: true, runValidators: true }
        );
        if(!client){
            return res.status(404).json({message: "No client found with given Id", flag: false});
        }
        return res.status(200).json({ message: "Successfully edited client details", flag: true, body: client });

    }catch(err){
        if (err.code === 11000){
            return res.status(409).json({message: "Client name already exists", flag: false});
        }
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

        const client= await RegularClient.findById(id).populate({
            path: 'items.itemDetails',
            populate: { path: 'itemType' }
        });

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
