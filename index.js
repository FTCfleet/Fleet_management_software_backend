if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require("mongoose");
const path = require('path');
const axios = require("axios");

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
const loadingListRoutes = require("./routes/loadingListRoutes.js");
const unloadingListRoutes = require("./routes/unloadingListRoutes.js");
const driverRoutes = require("./routes/driverRoutes.js");
const serviceEnquiryRoutes = require("./routes/serviceEnquiryRoutes.js");
const analyticsRoutes = require("./routes/analyticsRoutes.js");
const paymentTrackingRoutes = require("./routes/paymentTrackingRoutes.js");
// const backupRoutes = require("./routes/backupRoutes.js");
const { getQZSignature } = require('./controllers/networkPrintController.js');
const { authenticateToken } = require('./middleware/auth');

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
        'https://ftcfleet.netlify.app',
        'http://localhost:5173'
    ],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Serve static files (SEO files, assets)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.use('/api/auth', authRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use('/api/loadinglist', loadingListRoutes);
app.use('/api/unloadinglist', unloadingListRoutes);
app.use('/api/parcel', parcelRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/service-enquiry', serviceEnquiryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/payment-tracking', paymentTrackingRoutes);

// QZ Tray signature endpoint
app.post('/api/qz-sign', getQZSignature);

app.post('/api/logs', authenticateToken, (req, res) => {
    try {
        console.log(JSON.stringify({
            source: 'client',
            level: req.body.level,
            message: req.body.message,
            data: req.body.data,
            timestamp: req.body.timestamp
        }));
    }
    catch (error) {
        console.error('Error processing log:', error);
    }
    res.status(200).json({ success: true });
});

/*
app.use('/api/send-sms', async (req, res) => {

    const options = {
    method: 'POST',
    url: 'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
    headers: {
        accept: 'application/json',
        authkey: '509250ADVL8CDC69e0e096P1',
        'content-type': 'application/json'
    },
    data: '{\n    "integrated_number": "916281696385",\n    "content_type": "template",\n    "payload": {\n        "messaging_product": "whatsapp",\n        "type": "template",\n        "template": {\n            "name": "order_delivered",\n            "language": {\n                "code": "en_US",\n                "policy": "deterministic"\n            },\n            "namespace": "d3550953_8229_42fd_b2d2_4d3ae4991ae9",\n            "to_and_components": [\n                {\n                    "to": [\n                        "919113486790"\n                    ],\n                    "components": {\n                        "body_map_url": {\n                            "type": "text",\n                            "value": "https://maps.app.goo.gl/gtTf3cu4dfDgRJL16?g_st=aw",\n                            "parameter_name": "map_url"\n                        },\n                        "body_destination": {\n                            "type": "text",\n                            "value": "Hyderabad",\n                            "parameter_name": "destination"\n                        },\n                        "body_website_url": {\n                            "type": "text",\n                            "value": "https://friendstransport.in/track",\n                            "parameter_name": "website_url"\n                        },\n                        "body_tracking_id": {\n                            "type": "text",\n                            "value": "SBD-12345",\n                            "parameter_name": "tracking_id"\n                        }\n                    }\n                }\n            ]\n        }\n    }\n}'
    };

    try {
    const { data } = await axios.request(options);
    console.log(data);
    } catch (error) {
    console.error(error);
    }
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