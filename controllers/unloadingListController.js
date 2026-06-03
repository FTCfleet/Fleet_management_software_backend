const UnloadingList = require("../models/unloadingListSchema.js");
const { getNow } = require("../utils/dateFormatter.js");
const Warehouse = require("../models/warehouseSchema.js");
const Parcel = require("../models/parcelSchema.js");
const mongoose = require("mongoose");

// Population config reused by track and track-all endpoints
const unloadingListPopulateConfig = [
    { path: 'sourceWarehouse' },
    { path: 'destinationWarehouse' },
    { path: 'scannedBy', select: 'name username phoneNo' },
    { path: 'parcels.parcel', select: 'trackingId items', populate: { path: 'items' } }
];

/**
 * POST /new
 * Creates a new unloading list.
 * - Employee must belong to a destination warehouse (isSource === false)
 * - Validates parcels, deduplicates, discards invalid IDs
 * - count of -1 means use total item count; otherwise min(given, totalItems)
 */
module.exports.createUnloadingList = async (req, res) => {
    try {
        const { vehicleNo, driverName, driverPhone, sourceWarehouse, parcels } = req.body;

        // --- Validate required fields ---
        if (!vehicleNo) {
            return res.status(404).json({ message: "Vehicle number is required", flag: false });
        }
        if (!parcels || !Array.isArray(parcels) || parcels.length === 0) {
            return res.status(404).json({ message: "Parcels list is required and cannot be empty", flag: false });
        }

        // --- Verify the employee belongs to a destination warehouse ---
        const employeeWarehouse = req.user.warehouseCode; // populated by authenticateToken
        let destWh = employeeWarehouse;

        // If warehouseCode wasn't populated or missing isSource, fetch it
        if (!destWh || destWh.isSource === undefined) {
            destWh = await Warehouse.findById(req.user.warehouseCode);
        }

        if (!destWh) {
            return res.status(404).json({ message: "Employee is not assigned to any warehouse", flag: false });
        }
        if (destWh.isSource) {
            return res.status(403).json({ message: "Access denied. Only employees from a destination warehouse can create unloading lists", flag: false });
        }

        // --- Validate source warehouse ---
        if (!sourceWarehouse) {
            return res.status(404).json({ message: "Source warehouse is required", flag: false });
        }

        const srcWh = await Warehouse.findById(sourceWarehouse);
        if (!srcWh) {
            return res.status(404).json({ message: "Source warehouse not found", flag: false });
        }

        // --- Process parcels: validate, compute count ---
        // Validate each parcel ID exists in DB
        const validParcels = [];
        for (const [trackingId, rawCount] of parcels) {
            const parcelDoc = await Parcel.findOne({ trackingId }).select('items').populate('items');
            if (!parcelDoc) {
                continue; // discard non-existent parcel
            }

            const totalItemCount = parcelDoc.items.reduce((acc, item) => acc + item.quantity, 0);

            let count = rawCount;
            // If count is -1, set it to total item count
            if (count === -1) {
                count = totalItemCount;
            }

            // Count is always minimum of given and total item count
            count = Math.min(count, totalItemCount);

            validParcels.push({
                parcel: parcelDoc._id,
                count
            });
        }

        // If all parcel IDs were invalid, don't create
        if (validParcels.length === 0) {
            return res.status(404).json({ message: "No valid parcels found. Unloading list not created", flag: false });
        }

        // --- Create the unloading list ---
        const newUnloadingList = new UnloadingList({
            vehicleNo,
            driverName: driverName || 'N/A',
            driverPhone: driverPhone || 'N/A',
            sourceWarehouse: srcWh._id,
            destinationWarehouse: destWh._id,
            createdAt: getNow(),
            parcels: validParcels,
            scannedBy: req.user._id
        });

        const savedList = await newUnloadingList.save();

        return res.status(200).json({
            message: "Unloading list created successfully",
            body: savedList._id,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while creating the unloading list",
            error: err.message,
            flag: false
        });
    }
};

/**
 * GET /track/:id
 * Track a specific unloading list by its _id (uuid).
 * Returns the unloading list with populated warehouses and parcel count.
 */
module.exports.trackUnloadingList = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid unloading list ID", flag: false });
        }

        const unloadingList = await UnloadingList.findById(id)
            .populate(unloadingListPopulateConfig);

        if (!unloadingList) {
            return res.status(404).json({
                message: `Can't find any Unloading List with ID: ${id}`,
                body: {},
                flag: false
            });
        }

        return res.status(200).json({
            message: "Successfully fetched unloading list",
            body: unloadingList,
            parcelCount: unloadingList.parcels ? unloadingList.parcels.length : 0,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while tracking the unloading list",
            error: err.message,
            flag: false
        });
    }
};

/**
 * GET /track-all/:date
 * Get all unloading lists for a given date (yyyy-mm-dd).
 * Optional query params: sourceWarehouse, destinationWarehouse (warehouseID string)
 * Returns unloading lists with populated warehouses.
 */
module.exports.getUnloadingListsByDate = async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date format
        const startDate = new Date(`${date}T00:00:00.000Z`);
        const endDate = new Date(`${date}T23:59:59.999Z`);

        if (isNaN(startDate.getTime())) {
            return res.status(404).json({ message: "Invalid date format. Use yyyy-mm-dd", flag: false });
        }

        // Build query
        const query = {
            createdAt: { $gte: startDate, $lte: endDate }
        };

        // Optional: filter by sourceWarehouse
        const { sourceWarehouse, destinationWarehouse } = req.query;

        if (sourceWarehouse) {
            const srcWh = await Warehouse.findOne({ warehouseID: sourceWarehouse });
            if (!srcWh) {
                return res.status(404).json({ message: "Source warehouse not found", flag: false });
            }
            query.sourceWarehouse = srcWh._id;
        }

        // Optional: filter by destinationWarehouse
        if (destinationWarehouse) {
            const destWh = await Warehouse.findOne({ warehouseID: destinationWarehouse });
            if (!destWh) {
                return res.status(404).json({ message: "Destination warehouse not found", flag: false });
            }
            query.destinationWarehouse = destWh._id;
        }

        const unloadingLists = await UnloadingList.find(query)
            .populate(unloadingListPopulateConfig)

        return res.status(200).json({
            message: "Successfully fetched unloading lists",
            body: unloadingLists,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while fetching unloading lists",
            error: err.message,
            flag: false
        });
    }
};
