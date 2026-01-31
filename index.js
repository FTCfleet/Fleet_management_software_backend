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
const Item = require("./models/itemSchema.js");
const Parcel = require("./models/parcelSchema.js");
const Ledger = require("./models/ledgerSchema.js");

const authRoutes = require("./routes/authRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const warehouseRoutes = require("./routes/warehouseRoutes.js")
const parcelRoutes = require("./routes/parcelRoutes.js");
const ledgerRoutes = require("./routes/ledgerRoutes.js");
const driverRoutes = require("./routes/driverRoutes.js");
const serviceEnquiryRoutes = require("./routes/serviceEnquiryRoutes.js");
const analyticsRoutes = require("./routes/analyticsRoutes.js");
const paymentTrackingRoutes = require("./routes/paymentTrackingRoutes.js");
// const backupRoutes = require("./routes/backupRoutes.js");

mongoose.connect(dbUrl);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", () => {
    console.log("Database Connected");
});

const corsOptions = {
    origin: [
        'https://friendstransport.in',
        'http://friendstransport.in',
        'https://www.friendstransport.in',
        'http://www.friendstransport.in',
        'https://ftcfleet.netlify.app'
    ],
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
app.use('/api/payment-tracking', paymentTrackingRoutes);
// app.use('/api/backup', backupRoutes);

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