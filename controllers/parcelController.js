const Parcel = require("../models/parcelSchema.js");
const Ledger = require("../models/ledgerSchema.js");
const Client = require("../models/clientSchema.js");
const RegularClient = require("../models/regularClientSchema.js");
const RegularItem = require("../models/regularItemSchema.js");
const Item = require("../models/itemSchema.js");
const PaymentTracking = require("../models/paymentTrackingSchema.js");
const generateQRCode = require("../utils/qrCodeGenerator.js");
const { generateLRSheet } = require("../utils/LRreceiptFormat.js");
const { generateLRSheetThermal, generateLRForQZTray } = require("../utils/LRThermal.js");
const Warehouse = require("../models/warehouseSchema.js");
const ItemType = require("../models/itemTypeSchema.js");
const {getNow} = require("../utils/dateFormatter.js");
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const qrCodeTemplate = require("../utils/qrCodesTemplate.js");
const fs = require('fs');
const path = require('path');
const { toDbValue } = require("../utils/currencyUtils.js");

const ITEM_TYPE_COLLATION = { locale: 'en', strength: 2 };
const normalizeString = (value) => typeof value === 'string' ? value.trim() : '';
const sanitizedValue = (value) => {
    const normalized = normalizeString(value);
    if (!normalized) {
        return null;
    }
    if (normalized.toLowerCase() === 'na') {
        return null;
    }
    return normalized;
};
const normalizeItemTypeName = (input) => {
    if (typeof input === 'string') {
        return input.trim();
    }
    if (input && typeof input === 'object' && typeof input.name === 'string') {
        return input.name.trim();
    }
    return '';
};
const buildRegularClientPayload = (details = {}) => {
    const name = sanitizedValue(details.name);
    const phoneNo = sanitizedValue(details.phoneNo);
    const address = sanitizedValue(details.address);
    const gst = sanitizedValue(details.gst);

    if (!name) {
        return null;  
    }

    // Ensure at least one of phoneNo or gst is present
    if (!phoneNo && !gst) {
        return null;
    }

    return { 
        name, 
        phoneNo: phoneNo || "NA", 
        address: address || "NA", 
        gst: gst?.toUpperCase() || "NA" 
    };
};


const upsertRegularClientDirectory = async (details = {}, isSenderEntry = false) => {
    const payload = buildRegularClientPayload(details);
    if (!payload) {
        return null;
    }

    const queryConditions = [{ name: payload.name }];
    if (payload.phoneNo !== "NA") queryConditions.push({ phoneNo: payload.phoneNo });
    if (payload.gst !== "NA") queryConditions.push({ gst: payload.gst });

    const existingClient = await RegularClient.findOne({ $or: queryConditions }).collation(ITEM_TYPE_COLLATION);

    if (!existingClient) {
        const newClient = new RegularClient({
            ...payload,
            isSender: Boolean(isSenderEntry)
        });
        
        await newClient.save();
        return newClient;
    }
    return existingClient;
};

const createParcelPopulateConfig = (includeLastModified = false) => {
    const basePopulate = [
        { path: 'items', populate: { path: 'itemType' } },
        { path: 'sender' },
        { path: 'receiver' },
        { path: 'sourceWarehouse' },
        { path: 'destinationWarehouse' },
        { path: 'addedBy' }
    ];
    if (includeLastModified) {
        basePopulate.push({ path: 'lastModifiedBy' });
    }
    return basePopulate;
};

async function getNextTrackingNumber(warehouseId) {
  const warehouse = await Warehouse.findOneAndUpdate(
    { _id: warehouseId },
    [
      {
        $set: {
          sequence: {
            $cond: {
              if: { $gte: ["$sequence", 100000] },
              then: 1,
              else: { $add: ["$sequence", 1] }
            }
          }
        }
      }
    ],
    { new: true }
  );

  return String(warehouse.sequence).padStart(5, '0');
}

async function removeOlderSequenceParcel(trackingId) {
    const session = await Parcel.startSession();
    session.startTransaction();

    try {
        // 1️⃣ Find parcel with minimal fields needed and delete it atomically
        const parcel = await Parcel.findOneAndDelete(
            { trackingId },
            { session, projection: "items sender receiver ledgerId" }
        );

        if (!parcel) {
            await session.commitTransaction();
            session.endSession();
            console.log("No parcel found with this trackingId.");
            return null;
        }

        // Gather related IDs
        const itemIds = parcel.items || [];
        const clientIds = [...new Set(
            [parcel.sender, parcel.receiver].filter(Boolean)
        )];

        // 2️⃣ Bulk delete related Items (only if any exist)
        if (itemIds.length > 0) {
            await Item.deleteMany(
            { _id: { $in: itemIds } },
            { session }
            );
        }

        // 3️⃣ Bulk delete Clients (Sender & Receiver)
        if (clientIds.length > 0) {
            await Client.deleteMany(
            { _id: { $in: clientIds } },
            { session }
            );
        }

        // 4️⃣ Check the ledger
        const ledger = await Ledger.findById(parcel.ledgerId)
            .select("parcels")
            .session(session);

        if (ledger) {
            if (ledger.parcels.length === 1) {
            // last parcel → delete whole ledger
            await Ledger.deleteOne({ _id: ledger._id }, { session });

            console.log("Parcel deleted + Ledger deleted (was last parcel)");
            } else {
            // remove only this parcel from ledger array
            await Ledger.updateOne(
                { _id: ledger._id },
                { $pull: { parcels: parcel._id } },
                { session }
            );

            console.log("Parcel deleted + Ledger updated");
            }
        }

        await session.commitTransaction();
        session.endSession();

        return parcel; // returning deleted parcel info if needed

    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Cascade delete failed:", err);
        throw err;
    }

}


module.exports.newParcel = async (req, res) => {
    try {
        let { items, senderDetails, receiverDetails, destinationWarehouse, sourceWarehouse, payment, isDoorDelivery, doorDeliveryCharge } = req.body;
        if (!sourceWarehouse) {
            // sourceWarehouse = req.user.warehouseCode;
            sourceWarehouse = await Warehouse.findById(req.user.warehouseCode);
        }
        else {
            sourceWarehouse = await Warehouse.findOne({ warehouseID: sourceWarehouse });
        }

        const destinationWarehouseId = await Warehouse.findOne({ warehouseID: destinationWarehouse });

        let startName = sourceWarehouse.warehouseID.split('-')[0].slice(0,3);
        let startNum = sourceWarehouse.warehouseID.split('-')[1] ?? '';
        const nextSerial = await getNextTrackingNumber(sourceWarehouse._id);
        const trackingId = startName + startNum + '-' + nextSerial;

        // removeOlderSequenceParcel(trackingId);

        const itemEntries = [];
        const typeCache = new Map();
        let totalFreight = 0;
        let totalHamali = 0;
        for (const item of items) {
            const typeName = normalizeItemTypeName(item.type);
            if (!typeName) {
                return res.status(400).json({ message: "Item type name is required for each item", flag: false });
            }

            const cacheKey = typeName.toLowerCase();
            let typeRecord = typeCache.get(cacheKey);
            if (!typeRecord) {
                typeRecord = await ItemType.findOne({ name: typeName }).collation(ITEM_TYPE_COLLATION);
                if (!typeRecord) {
                    return res.status(400).json({ message: `Item type "${typeName}" does not exist`, flag: false });
                }
                typeCache.set(cacheKey, typeRecord);
            }
            const rawItemName = typeof item.name === 'string' ? item.name.trim() : '';
            if (!rawItemName) {
                continue;
            }

            // Convert freight and hamali to DB format (multiply by 100)
            const freightDb = toDbValue(item.freight);
            const hamaliDb = toDbValue(item.hamali);

            const existingItem = await RegularItem.findOne({ name: rawItemName, itemType: typeRecord._id }).collation(ITEM_TYPE_COLLATION);
            if (!existingItem) {
                const newItem = new RegularItem({
                    name: rawItemName,
                    itemType: typeRecord._id,
                    freight: freightDb,
                    hamali: hamaliDb,
                });
                await newItem.save();
            }

            const newItem = new Item({
                name: rawItemName,
                itemType: typeRecord._id,
                quantity: item.quantity,
                freight: freightDb,
                hamali: hamaliDb,
            });
            const savedItem = await newItem.save();
            itemEntries.push(savedItem._id);
            // Only add to totals if values are not null
            totalFreight += (freightDb || 0) * item.quantity;
            totalHamali += (hamaliDb || 0) * item.quantity;
        }

        await Promise.all([
            upsertRegularClientDirectory(senderDetails, true),
            upsertRegularClientDirectory(receiverDetails, false)
        ]);

        const sender = new Client(senderDetails);
        const receiver = new Client(receiverDetails);

        const newSender = await sender.save();
        const newReceiver = await receiver.save();
        
        const newParcel = new Parcel({
            items: itemEntries,
            sender: newSender._id,
            receiver: newReceiver._id,
            sourceWarehouse: sourceWarehouse._id,
            destinationWarehouse: destinationWarehouseId._id,
            trackingId,
            payment,
            isDoorDelivery,
            status: 'arrived', 
            freight: totalFreight,
            hamali: totalHamali, 
            placedAt: getNow(),
            lastModifiedAt: getNow(),
            addedBy: req.user._id,
            lastModifiedBy: req.user._id,
            doorDeliveryCharge: isDoorDelivery ? toDbValue(doorDeliveryCharge) : 0
        });
        // console.log(newParcel.placedAt);

        await newParcel.save();

        // Create payment tracking entry if payment is "To Pay"
        if (payment === 'To Pay') {
            await PaymentTracking.create({
                parcel: newParcel._id,
                paymentStatus: 'To Pay'
            });
        }

        return res.status(200).json({ message: "Parcel created successfully", body: trackingId, flag: true });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while creating the parcel", error: err.message, flag: false });
    }
};

module.exports.trackParcel = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig(true));
        if (!parcel) {
            return res.status(201).json({ message: `Can't find any Parcel with Tracking Id. ${id}`, body: {}, flag: false });
        }
        const { qrCodeURL } = await generateQRCode(id);

        // parcel.placedAt = formatToIST(parcel.placedAt);
        // parcel.lastModifiedAt = formatToIST(parcel.lastModifiedAt);

        // console.log(parcel);
        return res.status(200).json({ message: "Successfully fetched your parcel", body: parcel, flag: true, qrCode: qrCodeURL });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while tracking your parcel", error: err.message, flag: false });
    }
}

module.exports.allParcel = async (req, res) => {
    try {
        if (!req.user || !req.user.warehouseCode) {
            return res.status(401).json({
                message: "Unauthorized: No warehouse access", flag: false
            });
        }

        // 1. Pagination
        const page = parseInt(req.query.page) || 1;
        const PAGE_SIZE = 200;

        // 2. Date Filter (Mandatory)
        const dateInput = req.query.date;
        if (!dateInput) {
             return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD)", flag: false });
        }
        // Normalize date input YYYY-MM-DD
        // const formattedDate = dateInput.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'); 
        // Need to handle if input is already YYYY-MM-DD or YYYYMMDD? 
        // Existing logic used replace assuming YYYYMMDD -> YYYY-MM-DD. 
        // If frontend sends 2023-12-30 directly, the regex might fail or produce wrong result if not careful.
        // Let's support both or assume YYYY-MM-DD standard if possible, but keep compat with existing logic if YYYYMMDD was expected.
        // User Request: "Get the date... Send data in pagination... The date filter is that send the parcels of only that date"
        // Let's trust standard Date parsing.
        
        let startDate, endDate;
        startDate = new Date(`${dateInput}T00:00:00.000Z`);
        endDate = new Date(`${dateInput}T23:59:59.999Z`);

        if (isNaN(startDate.getTime())) {
             return res.status(400).json({ message: "Invalid Date format", flag: false });
        }

        let query = {
            placedAt: { $gte: startDate, $lte: endDate }
        };

        // 3. Status Filter (Optional)
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status;
        }

        // 4. Warehouse Logic
        const { src, dest } = req.query;
        let srcWh = null, destWh = null;

        if (src && src !== 'all') {
            srcWh = await Warehouse.findOne({ warehouseID: src });
            if (srcWh && srcWh.isSource) query.sourceWarehouse = srcWh._id;
        }
        if (dest && dest !== 'all') {
            destWh = await Warehouse.findOne({ warehouseID: dest });
            if (destWh && !destWh.isSource) query.destinationWarehouse = destWh._id;
        }

        // Role-Based Strict Filtering
        const employeeWhCode = req.user.warehouseCode; // This is populated object
        
        // Re-verify it is a populated object not just ID
        let whIsSource = false;
        let whId = employeeWhCode._id;

        if (employeeWhCode.isSource !== undefined) {
                whIsSource = employeeWhCode.isSource;
        } else {
                // If not populated for some reason, fetch it
                const w = await Warehouse.findById(employeeWhCode);
                if (w) {
                    whIsSource = w.isSource;
                    whId = w._id;
                }
        }

        if (req.user.role !== 'admin') {
            if (whIsSource) {
                // Must equal Source
                query.sourceWarehouse = whId;
            } else {
                // Must equal Destination
                query.destinationWarehouse = whId;
            }
        }
        
        // 5. Search Filters
        
        // ID Search
        if (req.query.id) {
            const idKey = req.query.id.trim();
            if (idKey) {
                query.trackingId = { $regex: '^' + idKey, $options: 'i' };
            }
        }

        // Name Search (Sender/Receiver)
        if (req.query.name) {
            const nameKey = req.query.name.trim();
            if (nameKey) {
                // Optimization: Find Client IDs first
                const clients = await Client.find({ 
                    name: { $regex: '^' + nameKey, $options: 'i' } 
                }).select('_id');
                const clientIds = clients.map(c => c._id);
                
                // Add to query (AND logic with existing filters)
                // Use $and to cleanly combine with any existing sourceWarehouse logic
                const nameFilter = { 
                    $or: [
                        { sender: { $in: clientIds } }, 
                        { receiver: { $in: clientIds } }
                    ] 
                };
                
                // Merge safely
                if (query.$or) {
                    // This shouldn't happen with current logic as we set fields directly, 
                    // but good practice if we changed logic above. 
                    // Current logic above sets query.sourceWarehouse = ... (direct assignment), not via $or.
                    // So we can simply add $or here.
                    query.$and = [
                        { $or: query.$or }, // Existing OR (e.g. from name search)
                        { $or: nameFilter.$or } // Our new warehouse constraint
                    ];
                    delete query.$or; // Move existing $or to $and
                } else {
                    query.$or = nameFilter.$or;
                }
            }
        }

        const parcels = await Parcel.find(query)
            .populate(createParcelPopulateConfig())
            .sort({ placedAt: -1 }) // Newest first
            .skip((page - 1) * PAGE_SIZE)
            .limit(PAGE_SIZE);

        const totalParcels = await Parcel.countDocuments(query);
        
        return res.status(200).json({ 
            body: {
                parcels,
                page: page,
                pageSize: PAGE_SIZE,
                totalPages: totalParcels === 0 ? 0 : Math.ceil(totalParcels / PAGE_SIZE),
                totalParcels
            },
            message: "Successfully fetched parcels", flag: true });

    } catch (err) {
        console.error('Error:', err);
        return res.status(500).json({
            message: "Error fetching parcels",
            error: err.message,
            flag: false
        });
    }
};

/**
 * GET /api/parcel/for-memo
 * Fetch ALL eligible parcels for memo/ledger creation (no pagination)
 * 
 * Query params:
 * - date: YYYY-MM-DD (required)
 * - src: source warehouse ID (optional, 'all' for all sources)
 * - dest: destination warehouse ID (required for memo creation)
 * 
 * Returns: Array of parcels with status 'arrived' (eligible for memo)
 */
module.exports.getParcelsForMemo = async (req, res) => {
    try {
        if (!req.user || !req.user.warehouseCode) {
            return res.status(401).json({
                message: "Unauthorized: No warehouse access", flag: false
            });
        }

        // Date Filter (Mandatory)
        const dateInput = req.query.date;
        if (!dateInput) {
            return res.status(400).json({ 
                message: "Date parameter is required (YYYY-MM-DD)", 
                flag: false 
            });
        }

        const startDate = new Date(`${dateInput}T00:00:00.000Z`);
        const endDate = new Date(`${dateInput}T23:59:59.999Z`);

        if (isNaN(startDate.getTime())) {
            return res.status(400).json({ 
                message: "Invalid Date format", 
                flag: false 
            });
        }

        // Destination warehouse (required for memo)
        const { dest } = req.query;
        if (!dest) {
            return res.status(400).json({ 
                message: "Destination warehouse is required", 
                flag: false 
            });
        }

        const destWh = await Warehouse.findOne({ warehouseID: dest });
        if (!destWh) {
            return res.status(404).json({ 
                message: `Destination Warehouse with ID ${dest} not found`, 
                flag: false 
            });
        }

        // Build query - only 'arrived' parcels are eligible for memo
        let query = {
            placedAt: { $gte: startDate, $lte: endDate },
            destinationWarehouse: destWh._id,
            status: 'arrived'
        };

        // Source warehouse filter - now supports multiple warehouses
        const { src } = req.query;
        if (src && src !== 'all') {
            // Check if src is a comma-separated list of warehouse IDs
            const srcArray = src.includes(',') ? src.split(',').map(s => s.trim()) : [src];
            
            // Find all matching warehouses
            const srcWarehouses = await Warehouse.find({ warehouseID: { $in: srcArray } });
            
            if (srcWarehouses.length === 0) {
                return res.status(404).json({ 
                    message: `No source warehouses found for IDs: ${src}`, 
                    flag: false 
                });
            }
            
            // If some IDs were not found, you might want to warn (optional)
            if (srcWarehouses.length !== srcArray.length) {
                const foundIds = srcWarehouses.map(w => w.warehouseID);
                const notFound = srcArray.filter(id => !foundIds.includes(id));
                console.warn(`Warning: Some warehouse IDs not found: ${notFound.join(', ')}`);
            }
            
            // Filter by multiple source warehouses
            query.sourceWarehouse = { $in: srcWarehouses.map(w => w._id) };
        }

        // Role-based filtering (non-admin users)
        if (req.user.role !== 'admin') {
            const employeeWhCode = req.user.warehouseCode;
            let whId = employeeWhCode._id;

            // Get warehouse details
            let whIsSource = employeeWhCode.isSource;
            if (whIsSource === undefined) {
                const w = await Warehouse.findById(employeeWhCode);
                if (w) {
                    whIsSource = w.isSource;
                    whId = w._id;
                }
            }

            // For destination warehouse staff, they can see parcels from any source
            // going to their destination (this allows them to create memos)
            if (!whIsSource) {
                // Destination warehouse staff - restrict by destination only
                query.destinationWarehouse = whId;
                // They can select any source warehouse(s) or 'all'
            } else {
                // Source warehouse staff - they can see parcels from any source going to any destination
                // BUT if they didn't specify 'all' or multiple sources, default to their warehouse
                if (!src || (src !== 'all' && !src.includes(','))) {
                    // If no source specified or single source (not 'all'), allow their selection
                    // but if no source filter was applied above, default to their warehouse
                    if (!query.sourceWarehouse) {
                        query.sourceWarehouse = whId;
                    }
                }
                // If they selected 'all' or multiple sources, let the above logic handle it
            }
        }

        // Fetch ALL parcels (no pagination for memo creation)
        const parcels = await Parcel.find(query)
            .populate(createParcelPopulateConfig())
            .sort({ placedAt: -1 });

        return res.status(200).json({ 
            body: parcels, 
            message: "Successfully fetched all parcels for memo", 
            flag: true 
        });

    } catch (err) {
        console.error('Error fetching parcels for memo:', err);
        return res.status(500).json({
            message: "Error fetching parcels",
            error: err.message,
            flag: false
        });
    }
};

module.exports.generateQRCodes = async (req, res) => {
    try {
        const { id } = req.params;
        const { count = 1 } = req.query;

        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());
        if (!parcel) {
            return res.status(404).json({ message: `Parcel not found. Tracking ID: ${id}`, flag: false });
        }

        const { qrCodeURL } = await generateQRCode(id);

        const receiverInfo = {
            name: parcel.receiver.name,
            phone: parcel.receiver.phoneNo,
            source: parcel.sourceWarehouse.name,
            destination: parcel.destinationWarehouse.name,
            date: parcel.placedAt.toLocaleDateString('en-IN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            })
        };

        const htmlContent = qrCodeTemplate(qrCodeURL, id, count, receiverInfo);

        let launchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        };
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        if (process.env.AWS_LAMBDA_FUNCTION_VERSION && chromium) {
            launchOptions = {
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            };
        }
        const browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            preferCSSPageSize: true
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="qr-codes.pdf"'); // Important change here
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);

    } catch (err) {
        console.error('Error generating QR codes:', err);
        return res.status(500).json({
            message: "Failed to generate QR codes",
            error: err.message,
            flag: true
        });
    }
};

module.exports.generateLR = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());
        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        console.log('Launching Puppeteer...');
        let launchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        };

        if (process.env.RENDER) {
            // Render environment — use @sparticuz/chromium
            launchOptions = {
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            };
        } else {
            // Local development — use system Chrome
            launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
            };
        }

        const browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();

        console.log('Setting page content...');
        // Embed logo image for header
        let logoDataUrl = null;
        try {
            const logoPath = path.join(__dirname, '..', 'assets', 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                const base64 = fs.readFileSync(logoPath).toString('base64');
                logoDataUrl = `data:image/jpeg;base64,${base64}`;
            }
        } catch (e) {
            console.warn('LR logo embedding failed:', e.message);
        }
        const htmlContent = generateLRSheet(parcel, { logoDataUrl });
        await page.setContent(htmlContent, { waitUntil: 'load' });
        await page.emulateMediaType('print');

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            width: '4in',
            height: '6in',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();

        console.log('Sending PDF response...');
        res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader('Content-Disposition', `attachment; filename="FTC LR RECEIPT ${id}.pdf"`); 
        res.setHeader('Content-Disposition', `inline; filename="FTC LR RECEIPT ${id}.pdf"`); 
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);

    } catch (err) {
        console.error('Error generating LR Receipt:', err);
        return res.status(500).json({
            message: "Failed to generate LR Receipt",
            error: err.message,
            flag: false
        });
    }
};

// Direct thermal print for QZ Tray (no preview, returns HTML)
module.exports.generateLRThermal = async (req, res) => {    
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        // Return HTML content directly for QZ Tray printing
        const htmlContent = generateLRSheetThermal(parcel, {});
        
        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);

    } catch (err) {
        console.error('Error generating LR Receipt:', err);
        return res.status(500).json({
            message: "Failed to generate LR Receipt",
            error: err.message,
            flag: false
        });
    }
};

// ESC/POS thermal print for QZ Tray with autocut (returns raw ESC/POS commands)
module.exports.generateLRThermalESCPOS = async (req, res) => {    
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        // Import ESC/POS generator
        const { generateThreeCopies } = require("../utils/LRThermalESCPOS.js");
        
        // Generate raw ESC/POS commands (includes autocut)
        const escposCommands = generateThreeCopies(parcel);
        
        // Convert string to Buffer using latin1 encoding (preserves binary ESC/POS commands)
        // latin1 (ISO-8859-1) maps each character code directly to a byte value
        const buffer = Buffer.from(escposCommands, 'latin1');
        
        // Return as binary data
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'inline');
        res.send(buffer);

    } catch (err) {
        console.error('Error generating ESC/POS Receipt:', err);
        return res.status(500).json({
            message: "Failed to generate ESC/POS Receipt",
            error: err.message,
            flag: false
        });
    }
};

// Preview thermal LR in print menu (generates PDF)
module.exports.previewLRThermal = async (req, res) => {    
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        console.log('Launching Puppeteer...');
        let launchOptions = {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        };

        if (process.env.RENDER) {
            // Render environment — use @sparticuz/chromium
            launchOptions = {
                args: chromium.args,
                executablePath: await chromium.executablePath(),
                headless: chromium.headless,
            };
        } else {
            // Local development — use system Chrome
            launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome',
            };
        }

        const browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();

        console.log('Setting page content...');
        // Embed logo image for header
        let logoDataUrl = null;
        try {
            const logoPath = path.join(__dirname, '..', 'assets', 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                const base64 = fs.readFileSync(logoPath).toString('base64');
                logoDataUrl = `data:image/jpeg;base64,${base64}`;
            }
        } catch (e) {
            console.warn('LR logo embedding failed:', e.message);
        }
        const htmlContent = generateLRSheetThermal(parcel, { logoDataUrl });
        await page.setContent(htmlContent, { waitUntil: 'load' });
        await page.emulateMediaType('print');

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            width: '78mm',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await browser.close();

        console.log('Sending PDF response...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="FTC LR THERMAL ${id}.pdf"`); 
        res.setHeader('Content-Length', pdfBuffer.length);
        res.end(pdfBuffer);

    } catch (err) {
        console.error('Error generating LR Receipt:', err);
        return res.status(500).json({
            message: "Failed to generate LR Receipt",
            error: err.message,
            flag: false
        });
    }
};

// New endpoint for QZ Tray printing with auto-cut support
module.exports.generateLRForQZTray = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        // Generate individual receipts for QZ Tray
        const lrData = generateLRForQZTray(parcel);

        // Return JSON with styles and individual receipt HTML
        res.json({
            flag: true,
            trackingId: id,
            styles: lrData.styles,
            receipts: lrData.receipts
        });

    } catch (err) {
        console.error('Error generating LR for QZ Tray:', err);
        return res.status(500).json({
            message: "Failed to generate LR for QZ Tray",
            error: err.message,
            flag: false
        });
    }
};

module.exports.editParcel = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Parcel ID is required', flag: false });
        }

        if (!updateData || Object.keys(updateData).length === 0) {
            return res.status(400).json({ message: 'Update data is required', flag: false });
        }

        let parcel = await Parcel.findOne({ trackingId: id });
        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        // Update items if provided
        if (updateData.addItems) {
            const typeCache = new Map();
            for (const item of updateData.addItems) {
                const typeName = normalizeItemTypeName(item.type);
                if (!typeName) {
                    return res.status(400).json({ message: "Item type name is required for each item", flag: false });
                }

                const cacheKey = typeName.toLowerCase();
                let typeRecord = typeCache.get(cacheKey);
                if (!typeRecord) {
                    typeRecord = await ItemType.findOne({ name: typeName }).collation(ITEM_TYPE_COLLATION);
                    if (!typeRecord) {
                        return res.status(400).json({ message: `Item type "${typeName}" does not exist`, flag: false });
                    }
                    typeCache.set(cacheKey, typeRecord);
                }

                // Convert freight and hamali to DB format (multiply by 100)
                const freightDb = toDbValue(item.freight);
                const hamaliDb = toDbValue(item.hamali);

                const existingItem = await RegularItem.findOne({ name: item.name, itemType: typeRecord._id }).collation(ITEM_TYPE_COLLATION);
                if (!existingItem) {
                    const newItem = new RegularItem({
                        name: item.name,
                        itemType: typeRecord._id,
                        freight: freightDb,
                        hamali: hamaliDb,
                    });
                    await newItem.save();
                }

                const newItem = new Item({
                    name: item.name,
                    itemType: typeRecord._id,
                    hamali: hamaliDb,
                    freight: freightDb,
                    quantity: item.quantity,
                });
                await newItem.save();
                parcel.items.push(newItem._id);
            }
        }

        if (updateData.delItems) {
            for (const itemId of updateData.delItems) {
                const itemIndex = parcel.items.indexOf(itemId);
                if (itemIndex > -1) {
                    parcel.items.splice(itemIndex, 1);
                    await Item.findByIdAndDelete(itemId);
                }
            }
        }

        // Update sender details if provided
        if (updateData.senderDetails) {
            const sender = await Client.findById(parcel.sender);
            if (sender) {
                Object.assign(sender, updateData.senderDetails);
                await sender.save();
            }
        }

        // Update receiver details if provided
        if (updateData.receiverDetails) {
            const receiver = await Client.findById(parcel.receiver);
            if (receiver) {
                Object.assign(receiver, updateData.receiverDetails);
                await receiver.save();
            }
        }

        // Update destination warehouse if provided
        if (updateData.destinationWarehouse) {
            const destinationWarehouseId = await Warehouse.findOne({ warehouseID: updateData.destinationWarehouse });
            if (destinationWarehouseId) {
                parcel.destinationWarehouse = destinationWarehouseId._id;
            }
        }

        // Update source warehouse if provided
        if (updateData.sourceWarehouse) {
            const sourceWarehouseId = await Warehouse.findOne({ warehouseID: updateData.sourceWarehouse });
            if (sourceWarehouseId) {
                parcel.sourceWarehouse = sourceWarehouseId._id;
            }
        }

        // Recalculate freight and hamali from all items
        const allItems = await Item.find({ _id: { $in: parcel.items } });
        parcel.freight = allItems.reduce((acc, item) => acc + ((item.freight || 0) * item.quantity), 0);
        parcel.hamali = allItems.reduce((acc, item) => acc + ((item.hamali || 0) * item.quantity), 0);

        if( updateData.payment) {
            parcel.payment = updateData.payment;
        }
        if (updateData.isDoorDelivery !== undefined) {
            parcel.isDoorDelivery = updateData.isDoorDelivery;
            parcel.doorDeliveryCharge = updateData.isDoorDelivery ? toDbValue(updateData.doorDeliveryCharge || 0) : 0;
        }
        if (req.user.role === 'admin' && updateData.status) {
            parcel.status = updateData.status;
        }

        parcel.lastModifiedBy = req.user._id;
        parcel.lastModifiedAt = getNow();
        await parcel.save();

        return res.status(200).json({ flag: true, message: "Parcel updated successfully", body: parcel, flag: true });
    } catch (err) {
        return res.status(500).json({ flag: false, message: "Failed to update parcel", error: err.message, flag: false });
    }
};

module.exports.getParcelsForApp = async (req, res) => {
    try {
        const user = req.user;
        const {q}= req.query;

        if(!q){
            return res.status(500).json({ message: "Failed to get all parcel details (for app)", error: err.message, flag: false });
        }

        let parcels = [];
        if (user.warehouseCode.isSource) {
            let temp = await Parcel.find({ $and: [{ status: 'arrived' }, { sourceWarehouse: user.warehouseCode._id }] });
            parcels = temp.map((parcel) => parcel.trackingId)
        } else {
            let temp = await Parcel.find({ $and: [{ status: 'dispatched' }, { destinationWarehouse: user.warehouseCode._id }] }).populate('ledgerId');

            parcels = temp.map((parcel) => {
                if ((parcel.ledgerId.vehicleNo === q) && (parcel.ledgerId.status === "dispatched") || (parcel.ledgerId.status === "verified")) {
                    return parcel.trackingId;
                }
            })
        }

        return res.status(200).json({ message: "Successfully fetched parcels for respective warehouse", body: parcels, flag: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to get all parcel details (for app)", error: err.message, flag: false });
    }
}

// ESC/POS endpoint for mobile thermal printing
module.exports.generateLRESCPOS = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate(createParcelPopulateConfig());

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        const { generateThreeCopies } = require('../utils/LRThermalESCPOS.js');
        const escposData = generateThreeCopies(parcel);

        // Return ESC/POS commands as text
        res.setHeader('Content-Type', 'text/plain');
        res.send(escposData);

    } catch (err) {
        console.error('Error generating ESC/POS data:', err);
        return res.status(500).json({
            message: "Failed to generate ESC/POS data",
            error: err.message,
            flag: false
        });
    }
};
