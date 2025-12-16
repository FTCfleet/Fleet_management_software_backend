const Parcel = require("../models/parcelSchema.js");
const Ledger = require("../models/ledgerSchema.js");
const Client = require("../models/clientSchema.js");
const RegularClient = require("../models/regularClientSchema.js");
const RegularItem = require("../models/regularItemSchema.js");
const Item = require("../models/itemSchema.js");
const generateQRCode = require("../utils/qrCodeGenerator.js");
const { generateLRSheet } = require("../utils/LRreceiptFormat.js");
const Warehouse = require("../models/warehouseSchema.js");
const ItemType = require("../models/itemTypeSchema.js");
const {getNow} = require("../utils/dateFormatter.js");
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const qrCodeTemplate = require("../utils/qrCodesTemplate.js");
const fs = require('fs');
const path = require('path');

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

            const existingItem = await RegularItem.findOne({ name: rawItemName, itemType: typeRecord._id }).collation(ITEM_TYPE_COLLATION);
            if (!existingItem) {
                const newItem = new RegularItem({
                    name: rawItemName,
                    itemType: typeRecord._id,
                    freight: item.freight,
                    hamali: item.hamali,
                });
                await newItem.save();
            }

            const newItem = new Item({
                name: rawItemName,
                itemType: typeRecord._id,
                quantity: item.quantity,
                freight: item.freight,
                hamali: item.hamali,
            });
            const savedItem = await newItem.save();
            itemEntries.push(savedItem._id);
            totalFreight += Number(item.freight*item.quantity || 0);
            totalHamali += Number(item.hamali*item.quantity || 0);
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
            doorDeliveryCharge: isDoorDelivery ? doorDeliveryCharge : 0
        });
        // console.log(newParcel.placedAt);

        await newParcel.save();

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
        if ((!req.user || !req.user.warehouseCode) && !req.user.role === 'admin') {
            return res.status(401).json({
                message: "Unauthorized: No warehouse access", flag: false
            });
        }
        
        const src= req.query.src;
        const dest= req.query.dest;
        
        // console.log("Source:", src, "Destination:", dest);
        
        // console.log(q);
        let srcWh= null;
        let destWh= null;
        if(src && src !== 'all'){
            srcWh = await Warehouse.findOne({ warehouseID: src });
            if(!srcWh){
                return res.status(404).json({ message: `Source Warehouse with ID ${src} not found`, flag: false });
            }
        }

        if(dest){
            destWh = await Warehouse.findOne({ warehouseID: dest });   
            if(!destWh){
                return res.status(404).json({ message: `Destination Warehouse with ID ${dest} not found`, flag: false });
            }
        }
        
        const employeeWHcode = req.user.warehouseCode;
        // console.log(wh);

        const formattedDate = req.body.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        const startDate = new Date(`${formattedDate}T00:00:00.000Z`);
        const endDate = new Date(`${formattedDate}T23:59:59.999Z`);

        // console.log(startDate);
        // console.log(endDate);
        let parcels;
        if (src){
            if (src === 'all'){
                parcels = await Parcel.find({
                    placedAt: { $gte: startDate, $lte: endDate },
                    destinationWarehouse: destWh._id,
                    status: 'arrived'
                })
                .populate(createParcelPopulateConfig());
            }
            else{
                parcels = await Parcel.find({
                    placedAt: { $gte: startDate, $lte: endDate },
                    sourceWarehouse: srcWh._id,
                    destinationWarehouse: destWh._id,
                    status: 'arrived'
                })
                .populate(createParcelPopulateConfig());

            }
        }
        else{
            if (req.user.role === 'admin') {
                parcels = await Parcel.find({
                    placedAt: { $gte: startDate, $lte: endDate },
                })
                .populate(createParcelPopulateConfig());
            }
            else{
                parcels = await Parcel.find({
                    placedAt: { $gte: startDate, $lte: endDate },
                    $or: [{ sourceWarehouse: employeeWHcode }, { destinationWarehouse: employeeWHcode }],
                })
                .populate(createParcelPopulateConfig());
            }
        }
        return res.status(200).json({ body: parcels, message: "Successfully fetched all parcels", flag: true });

    } catch (err) {
        console.error('Error:', err);
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
            // Local development — use installed full Puppeteer
            const puppeteerLocal = require('puppeteer');
            launchOptions = {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: puppeteerLocal.executablePath(),
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

                const existingItem = await RegularItem.findOne({ name: item.name, itemType: typeRecord._id }).collation(ITEM_TYPE_COLLATION);
                if (!existingItem) {
                    const newItem = new RegularItem({
                        name: item.name,
                        itemType: typeRecord._id,
                        freight: item.freight,
                        hamali: item.hamali,
                    });
                    await newItem.save();
                }

                const newItem = new Item({
                    name: item.name,
                    itemType: typeRecord._id,
                    hamali: item.hamali,
                    freight: item.freight,
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
        parcel.freight = allItems.reduce((acc, item) => acc + (item.freight*item.quantity || 0), 0);
        parcel.hamali = allItems.reduce((acc, item) => acc + (item.hamali*item.quantity || 0), 0);

        if( updateData.payment) {
            parcel.payment = updateData.payment;
        }
        if (updateData.isDoorDelivery !== undefined) {
            parcel.isDoorDelivery = updateData.isDoorDelivery;
            parcel.doorDeliveryCharge = updateData.isDoorDelivery ? (updateData.doorDeliveryCharge || 0) : 0;
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
