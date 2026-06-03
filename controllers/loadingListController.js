const LoadingList = require("../models/loadingListSchema.js");
const { getNow } = require("../utils/dateFormatter.js");
const Employee = require("../models/employeeSchema.js");
const Warehouse = require("../models/warehouseSchema.js");
const Parcel = require("../models/parcelSchema.js");
const mongoose = require("mongoose");

// Population config reused by track and track-all endpoints
const loadingListPopulateConfig = [
    { path: 'sourceWarehouse' },
    { path: 'destinationWarehouse' },
    { path: 'scannedBy', select: 'name username phoneNo' },
    { path: 'parcels.parcel', select: 'trackingId items', populate: { path: 'items' } }
];

/**
 * POST /new
 * Creates a new loading list.
 * - Employee must belong to a source warehouse
 * - Validates parcels, deduplicates, discards invalid IDs
 * - count of -1 means use total item count; otherwise min(given, totalItems)
 */
module.exports.createLoadingList = async (req, res) => {
    try {
        const { vehicleNo, driverName, driverPhone, destinationWarehouse, parcels } = req.body;

        // --- Validate required fields ---
        if (!vehicleNo) {
            return res.status(404).json({ message: "Vehicle number is required", flag: false });
        }
        if (!parcels || (typeof val === 'object' && val.constructor === Object) || Object.keys(parcels).length > 0) {
            return res.status(404).json({ message: "Parcels list is required and cannot be empty", flag: false });
        }

        // --- Verify the employee belongs to a source warehouse ---
        const employeeWarehouse = req.user.warehouseCode; // populated by authenticateToken
        let sourceWh = employeeWarehouse;

        // If warehouseCode wasn't populated or missing isSource, fetch it
        if (!sourceWh || sourceWh.isSource === undefined) {
            sourceWh = await Warehouse.findById(req.user.warehouseCode);
        }

        if (!sourceWh) {
            return res.status(404).json({ message: "Employee is not assigned to any warehouse", flag: false });
        }
        if (!sourceWh.isSource) {
            return res.status(403).json({ message: "Access denied. Only employees from a source warehouse can create loading lists", flag: false });
        }

        // --- Validate destination warehouse ---
        if (!destinationWarehouse) {
            return res.status(404).json({ message: "Destination warehouse is required", flag: false });
        }

        const destWh = await Warehouse.findById(destinationWarehouse);
        if (!destWh) {
            return res.status(404).json({ message: "Destination warehouse not found", flag: false });
        }

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
            return res.status(404).json({ message: "No valid parcels found. Loading list not created", flag: false });
        }

        // --- Create the loading list ---
        const newLoadingList = new LoadingList({
            vehicleNo,
            driverName: driverName || 'N/A',
            driverPhone: driverPhone || 'N/A',
            sourceWarehouse: sourceWh._id,
            destinationWarehouse: destWh._id,
            createdAt: getNow(),
            parcels: validParcels,
            scannedBy: req.user._id
        });

        const savedList = await newLoadingList.save();

        return res.status(200).json({
            message: "Loading list created successfully",
            body: savedList._id,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while creating the loading list",
            error: err.message,
            flag: false
        });
    }
};

/**
 * GET /track/:id
 * Track a specific loading list by its _id (uuid).
 * Returns the loading list with populated warehouses and parcel count.
 */
module.exports.trackLoadingList = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: "Invalid loading list ID", flag: false });
        }

        const loadingList = await LoadingList.findById(id)
            .populate(loadingListPopulateConfig);

        if (!loadingList) {
            return res.status(404).json({
                message: `Can't find any Loading List with ID: ${id}`,
                body: {},
                flag: false
            });
        }

        return res.status(200).json({
            message: "Successfully fetched loading list",
            body: loadingList,
            parcelCount: loadingList.parcels ? loadingList.parcels.length : 0,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while tracking the loading list",
            error: err.message,
            flag: false
        });
    }
};

/**
 * GET /track-all/:date
 * Get all loading lists for a given date (yyyy-mm-dd).
 * Optional query params: sourceWarehouse, destinationWarehouse (ObjectId)
 * Returns loading lists with populated warehouses and parcel count.
 */
module.exports.getLoadingListsByDate = async (req, res) => {
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
            const destWh = await Warehouse.findOne({warehouseID: destinationWarehouse });
            if (!destWh) {
                return res.status(404).json({ message: "Destination warehouse not found", flag: false });
            }
            query.destinationWarehouse = destWh._id;
        }

        const loadingLists = await LoadingList.find(query)
            .populate(loadingListPopulateConfig)

        return res.status(200).json({
            message: "Successfully fetched loading lists",
            body: loadingLists,
            flag: true
        });

    } catch (err) {
        return res.status(500).json({
            message: "An error occurred while fetching loading lists",
            error: err.message,
            flag: false
        });
    }
};