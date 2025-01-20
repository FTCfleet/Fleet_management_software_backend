const puppeteer = require('puppeteer');
const Parcel = require("../models/parcelSchema.js");
const Client = require("../models/clientSchema.js");
const Item = require("../models/itemSchema.js");
const generateUniqueId = require("../utils/uniqueIdGenerator.js");
const generateQRCode = require("../utils/qrCodeGenerator.js");
const generateLR = require("../utils/LRreceiptFormat.js");

module.exports.newParcel = async (req, res) => {
    try {
        const { items, senderDetails, receiverDetails, sourceWarehouse, destinationWarehouse } = req.body;

        const itemEntries = [];
        for (const item of items) {
            const newItem = new Item({
                name: item.name,
                description: item.description,
                quantity: item.quantity,
                itemId: generateUniqueId(14)
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
            destinationWarehouse,
            trackingId
        });

        await newParcel.save();

        for (const id of itemEntries) {
            const item = await Item.findById(id);
            item.parcelId = newParcel._id;
            await item.save();
        }

        return res.status(200).json({ message: "Parcel created successfully", body: {flag: true, trackingId} });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while creating the parcel", error: err.message });
    }
};

module.exports.trackParcel = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate('items sender receiver');

        if (!parcel) {
            return res.status(201).json({ message: `Can't find any Parcel with Tracking Id. ${id}`, body:{} });
        }

        return res.status(200).json({ message: "Successfully fetched your parcel", body: parcel });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while tracking your parcel", error: err.message });
    }
}

module.exports.allParcelNo = async (req, res) => {
    try {
        const allParcelId = await Parcel.find({
            completed: req.body.status !== undefined ? req.body.status : { $in: [true, false] }
        },
            'trackingId');
        if (allParcelId) {
            return res.status(200).json({ message: "Succesful", body: allParcelId});
        } else {
            return res.status(201).json({ message: "No Parcel number found", body:[] });
        }
    } catch (err) {
        return res.status(500).json({ message: "Failed to fetch parcel numbers", err });
    }
}


module.exports.generateQRCodes = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate('items');

        if (!parcel) {
            return res.status(201).json({ message: `Parcel not found. Tracking ID: ${id}`, body: [] });
        }

        let qrCodes = [];
        for (let item of parcel['items']) {
            let qrObj = await generateQRCode(item.itemId);
            qrCodes.push(qrObj);
        }

        return res.status(200).json({ message: "Successfully generated QR codes for the parcel items", body: qrCodes });

    } catch (err) {
        return res.status(500).json({ message: "An error occurred while tracking your parcel", error: err.message });
    }
}

module.exports.generateLR = async (req, res) => {
    try {
        const { id } = req.params;
        const parcel = await Parcel.findOne({ trackingId: id }).populate('items sender receiver');

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        const htmlContent = generateLR(parcel);
        await page.setContent(htmlContent, { waitUntil: 'load' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        await browser.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${id}.pdf"`);
        res.end(pdfBuffer);
    } catch (err) {
        return res.status(500).json({ message: "Failed to generate LR Receipt", error: err.message });
    }
}