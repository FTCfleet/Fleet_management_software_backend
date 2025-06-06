const Parcel = require("../models/parcelSchema.js");
const Client = require("../models/clientSchema.js");
const Item = require("../models/itemSchema.js");
const generateUniqueId = require("../utils/uniqueIdGenerator.js");
const generateQRCode = require("../utils/qrCodeGenerator.js");
const generateLR = require("../utils/LRreceiptFormat.js");
const Warehouse = require("../models/warehouseSchema.js");
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const qrCodeTemplate = require("../utils/qrCodesTemplate.js");
const Employee = require("../models/employeeSchema.js");

module.exports.newParcel = async (req, res) => {
    try {
        let { items, senderDetails, receiverDetails, destinationWarehouse, sourceWarehouse, freight, hamali, charges, payment, doorDelivery } = req.body;
        if (!sourceWarehouse) {
            sourceWarehouse = req.user.warehouseCode;
        }
        else {
            sourceWarehouse = (await Warehouse.findOne({ warehouseID: sourceWarehouse }))._id;
        }

        const destinationWarehouseId = await Warehouse.findOne({ warehouseID: destinationWarehouse });
        const itemEntries = [];
        for (const item of items) {
            const newItem = new Item({
                name: item.name,
                type: item.type,
                quantity: item.quantity,
                freight: item.freight,
                hamali: item.hamali,
                statisticalCharges: item.hamali
            });
            const savedItem = await newItem.save();
            itemEntries.push(savedItem._id);
        }

        const sender = new Client(senderDetails);
        const receiver = new Client(receiverDetails);

        const newSender = await sender.save();
        const newReceiver = await receiver.save();

        const trackingId = generateUniqueId(12);
        const newParcel = new Parcel({
            items: itemEntries,
            sender: newSender._id,
            receiver: newReceiver._id,
            sourceWarehouse,
            destinationWarehouse: destinationWarehouseId._id,
            trackingId,
            payment,
            doorDelivery,
            status: 'arrived', 
            freight,
            hamali, 
            charges,
            addedBy: req.user._id
        });

        await newParcel.save();

        return res.status(200).json({ message: "Parcel created successfully", body: trackingId, flag: true });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while creating the parcel", error: err.message, flag: false });
    }
};

module.exports.trackParcel = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate('items sender receiver sourceWarehouse destinationWarehouse addedBy');
        if (!parcel) {
            return res.status(201).json({ message: `Can't find any Parcel with Tracking Id. ${id}`, body: {}, flag: false });
        }
        const { qrCodeURL } = await generateQRCode(id);

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

        const formattedDate = req.body.date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
        const startDate = new Date(`${formattedDate}T00:00:00.000Z`);
        const endDate = new Date(`${formattedDate}T23:59:59.999Z`);

        const employeeWHcode = req.user.warehouseCode;

        let parcels;
        if (req.user.role !== 'admin') {
            parcels = await Parcel.find({
                placedAt: { $gte: startDate, $lte: endDate },
                $or: [{ sourceWarehouse: employeeWHcode }, { destinationWarehouse: employeeWHcode }]
            })
                .populate('items sender receiver sourceWarehouse destinationWarehouse addedBy');
        } else {
            parcels = await Parcel.find({
                placedAt: { $gte: startDate, $lte: endDate },
            })
                .populate('items sender receiver sourceWarehouse destinationWarehouse addedBy');
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

        const parcel = await Parcel.findOne({ trackingId: id }).populate('items sender receiver sourceWarehouse destinationWarehouse addedBy');
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

        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

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
        const parcel = await Parcel.findOne({ trackingId: id }).populate('items sourceWarehouse destinationWarehouse sender receiver addedBy');

        if (!parcel) {
            return res.status(404).json({ message: `Can't find any Parcel with Tracking ID ${id}`, flag: false });
        }

        console.log('Launching Puppeteer...');
        const browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();

        console.log('Setting page content...');
        const htmlContent = generateLR(parcel);
        await page.setContent(htmlContent, { waitUntil: 'load' });

        console.log('Generating PDF...');
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        await browser.close();

        console.log('Sending PDF response...');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${id}.pdf"`); 
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
            for (const item of updateData.addItems) {
                const newItem = new Item({
                    name: item.name,
                    type: item.type,
                    hamali: item.hamali,
                    freight: item.freight,
                    statisticalCharges: item.hamali,
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

        if (updateData.charges) {
            parcel.charges = updateData.charges;
        }
        if (updateData.hamali) {
            parcel.hamali = updateData.hamali;
        }
        if (updateData.freight) {
            parcel.freight = updateData.freight;
        }
        if( updateData.payment) {
            parcel.payment = updateData.payment;
        }
        if (updateData.doorDelivery !== undefined) {
            parcel.doorDelivery = updateData.doorDelivery;
        }
        if (req.user.role === 'admin' && updateData.status) {
            parcel.status = updateData.status;
        }
        await parcel.save();

        return res.status(200).json({ flag: true, message: "Parcel updated successfully", body: parcel, flag: true });
    } catch (err) {
        return res.status(500).json({ flag: false, message: "Failed to update parcel", error: err.message, flag: false });
    }
};

module.exports.getParcelsForApp = async (req, res) => {
    try {
        const user = req.user;
        let parcels = [];
        if (user.warehouseCode.isSource) {
            let temp = await Parcel.find({ $and: [{ status: 'arrived' }, { sourceWarehouse: user.warehouseCode._id }] });
            parcels = temp.map((parcel) => parcel.trackingId)
        } else {
            let temp = await Parcel.find({ $and: [{ status: 'dispatched' }, { destinationWarehouse: user.warehouseCode._id }] }).populate('ledgerId');
            parcels = temp.map((parcel) => {
                if ((parcel.ledgerId.status === "dispatched") || (parcel.ledgerId.status === "verified")) {
                    return parcel.trackingId;
                }
            })
        }

        return res.status(200).json({ message: "Successfully fetched parcels for respective warehouse", body: parcels, flag: true });
    } catch (err) {
        return res.status(500).json({ message: "Failed to get all parcel details (for app)", error: err.message, flag: false });
    }
}