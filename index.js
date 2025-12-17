if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require("mongoose")

const dbUrl = process.env.DB_URL;
const PORT = process.env.PORT || 8000;

const ExpressError = require('./utils/expressError.js');
const Warehouse = require('./models/warehouseSchema.js');
const RegularItem = require("./models/regularItemSchema.js");

const authRoutes = require("./routes/authRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const warehouseRoutes = require("./routes/warehouseRoutes.js")
const parcelRoutes = require("./routes/parcelRoutes.js");
const ledgerRoutes = require("./routes/ledgerRoutes.js");
const driverRoutes = require("./routes/driverRoutes.js");
const serviceEnquiryRoutes = require("./routes/serviceEnquiryRoutes.js");
const analyticsRoutes = require("./routes/analyticsRoutes.js");

mongoose.connect(dbUrl);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", () => {
    console.log("Database Connected");
});

const corsOptions = {
    // origin: 'https://friendstransport.in',
    origin: '*',
    // origin: ['https://ftcfleet.netlify.app', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.use('/api/auth', authRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/parcel', parcelRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/service-enquiry', serviceEnquiryRoutes);
app.use('/api/analytics', analyticsRoutes);

/*
app.use('/fix', async (req, res) => {
    const warehouses = await Warehouse.find({});

    for (const wh of warehouses) {
    //   wh.sequence = 0; // default starting value
      wh.memoSequence = 0; // default starting value
      await wh.save();
    }
    return res.send("Fixed");
});

app.use('/fix-regular', async (req, res) => {
    const items = await RegularItem.find().populate("itemType");

        console.log(`Found ${items.length} items`);

        for (const item of items) {
            if (!item.itemType || !item.itemType.name) {
                console.log(`Skipping: Missing itemType for ${item._id}`);
                continue;
            }

            const itemTypeName = item.itemType.name;
            const original = item.name;
            
            // If already correct → skip
            if (!original.includes(` (${itemTypeName})`)) {
                console.log(`Already fixed: ${original}`);
                continue;
            }

            // Remove " (itemTypeName)"
            const fixedName = original.replace(` (${itemTypeName})`, "");

            if (fixedName !== original) {
                item.name = fixedName;
                await item.save();
                console.log(`Updated: "${original}" → "${fixedName}"`);
            }
        }

        console.log("🎉 Name cleanup completed.");
        return res.send("Done");
    });
*/

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
});

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Someting went Wrong !';
    return res.status(statusCode).json(err);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});