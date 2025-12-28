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
// const backupRoutes = require("./routes/backupRoutes.js");

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

/*
 * MIGRATION ROUTE: Multiply all monetary values by 100
 * 
 * Collections affected:
 * - Item: freight, hamali
 * - Parcel: freight, hamali, doorDeliveryCharge
 * - Ledger: lorryFreight
 * - RegularItem: freight, hamali
 * 
 * WARNING: Run this ONLY ONCE! Running multiple times will corrupt data.
 * After running, comment out or delete this route.
 * 
 * Improvements:
 * - Creates automatic backup before migration
 * - Uses bulkWrite for better performance
 * - Handles null/undefined values safely
 * - Continues on error and reports failures
 * - Provides detailed error tracking
 */

/*
app.get('/migrate-data', async (req, res) => {
    const { createBackup: createBackupUtil } = require('./utils/backup.js');
    
    const startTime = Date.now();
    const results = {
        backup: null,
        items: { total: 0, updated: 0, failed: 0, errors: [] },
        parcels: { total: 0, updated: 0, failed: 0, errors: [] },
        ledgers: { total: 0, updated: 0, failed: 0, errors: [] },
        regularItems: { total: 0, updated: 0, failed: 0, errors: [] }
    };

    // Helper to safely multiply by 100, handling null/undefined/NaN
    const safeMultiply = (value) => {
        const num = Number(value);
        return isNaN(num) ? 0 : Math.round(num * 100);
    };

    try {
        console.log("🚀 Starting currency migration...");

        // STEP 0: Create backup first
        console.log("\n💾 Creating backup before migration...");
        const backupUrl = process.env.BACKUP_URL;
        
        if (!backupUrl) {
            console.warn("⚠️ WARNING: BACKUP_URL not configured. Proceeding without backup!");
            console.warn("⚠️ It is HIGHLY RECOMMENDED to configure BACKUP_URL before running migrations.");
        } else {
            try {
                const CURRENCY_COLLECTIONS = [
                    { model: Item, name: 'Item' },
                    { model: Parcel, name: 'Parcel' },
                    { model: Ledger, name: 'Ledger' },
                    { model: RegularItem, name: 'RegularItem' }
                ];
                
                const backupResult = await createBackupUtil(CURRENCY_COLLECTIONS, backupUrl);
                results.backup = backupResult;
                
                if (!backupResult.success) {
                    console.error("❌ Backup failed! Aborting migration.");
                    return res.status(500).json({
                        success: false,
                        message: "Backup failed. Migration aborted for safety.",
                        results
                    });
                }
                
                console.log(`✅ Backup completed: ${backupResult.totalDocuments} documents backed up`);
            } catch (backupErr) {
                console.error("❌ Backup error:", backupErr.message);
                return res.status(500).json({
                    success: false,
                    message: "Backup failed. Migration aborted for safety.",
                    error: backupErr.message,
                    results
                });
            }
        }

        // STEP 1: Migrate Item collection (freight, hamali)
        console.log("\n📦 Migrating Items...");
        const items = await Item.find({}).lean();
        results.items.total = items.length;
        console.log(`Found ${items.length} items`);

        if (items.length > 0) {
            const itemBulkOps = items.map(item => ({
                updateOne: {
                    filter: { _id: item._id },
                    update: {
                        $set: {
                            freight: safeMultiply(item.freight),
                            hamali: safeMultiply(item.hamali)
                        }
                    }
                }
            }));

            try {
                const itemResult = await Item.bulkWrite(itemBulkOps, { ordered: false });
                results.items.updated = itemResult.modifiedCount;
                console.log(`✅ Items updated: ${itemResult.modifiedCount}`);
            } catch (err) {
                results.items.failed = items.length - results.items.updated;
                results.items.errors.push(err.message);
                console.error(`❌ Items error: ${err.message}`);
            }
        }

        // STEP 2: Migrate Parcel collection (freight, hamali, doorDeliveryCharge)
        console.log("\n📮 Migrating Parcels...");
        const parcels = await Parcel.find({}).lean();
        results.parcels.total = parcels.length;
        console.log(`Found ${parcels.length} parcels`);

        if (parcels.length > 0) {
            const parcelBulkOps = parcels.map(parcel => ({
                updateOne: {
                    filter: { _id: parcel._id },
                    update: {
                        $set: {
                            freight: safeMultiply(parcel.freight),
                            hamali: safeMultiply(parcel.hamali),
                            doorDeliveryCharge: safeMultiply(parcel.doorDeliveryCharge)
                        }
                    }
                }
            }));

            try {
                const parcelResult = await Parcel.bulkWrite(parcelBulkOps, { ordered: false });
                results.parcels.updated = parcelResult.modifiedCount;
                console.log(`✅ Parcels updated: ${parcelResult.modifiedCount}`);
            } catch (err) {
                results.parcels.failed = parcels.length - results.parcels.updated;
                results.parcels.errors.push(err.message);
                console.error(`❌ Parcels error: ${err.message}`);
            }
        }

        // STEP 3: Migrate Ledger collection (lorryFreight)
        console.log("\n📋 Migrating Ledgers...");
        const ledgers = await Ledger.find({}).lean();
        results.ledgers.total = ledgers.length;
        console.log(`Found ${ledgers.length} ledgers`);

        if (ledgers.length > 0) {
            const ledgerBulkOps = ledgers.map(ledger => ({
                updateOne: {
                    filter: { _id: ledger._id },
                    update: {
                        $set: {
                            lorryFreight: safeMultiply(ledger.lorryFreight)
                        }
                    }
                }
            }));

            try {
                const ledgerResult = await Ledger.bulkWrite(ledgerBulkOps, { ordered: false });
                results.ledgers.updated = ledgerResult.modifiedCount;
                console.log(`✅ Ledgers updated: ${ledgerResult.modifiedCount}`);
            } catch (err) {
                results.ledgers.failed = ledgers.length - results.ledgers.updated;
                results.ledgers.errors.push(err.message);
                console.error(`❌ Ledgers error: ${err.message}`);
            }
        }

        // STEP 4: Migrate RegularItem collection (freight, hamali)
        console.log("\n🔖 Migrating Regular Items...");
        const regularItems = await RegularItem.find({}).lean();
        results.regularItems.total = regularItems.length;
        console.log(`Found ${regularItems.length} regular items`);

        if (regularItems.length > 0) {
            const regularItemBulkOps = regularItems.map(item => ({
                updateOne: {
                    filter: { _id: item._id },
                    update: {
                        $set: {
                            freight: safeMultiply(item.freight),
                            hamali: safeMultiply(item.hamali)
                        }
                    }
                }
            }));

            try {
                const regularItemResult = await RegularItem.bulkWrite(regularItemBulkOps, { ordered: false });
                results.regularItems.updated = regularItemResult.modifiedCount;
                console.log(`✅ Regular Items updated: ${regularItemResult.modifiedCount}`);
            } catch (err) {
                results.regularItems.failed = regularItems.length - results.regularItems.updated;
                results.regularItems.errors.push(err.message);
                console.error(`❌ Regular Items error: ${err.message}`);
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n🎉 Currency migration completed in ${duration}s!`);
        console.log("\n📊 Summary:");
        console.log(`Items: ${results.items.updated}/${results.items.total} updated`);
        console.log(`Parcels: ${results.parcels.updated}/${results.parcels.total} updated`);
        console.log(`Ledgers: ${results.ledgers.updated}/${results.ledgers.total} updated`);
        console.log(`Regular Items: ${results.regularItems.updated}/${results.regularItems.total} updated`);

        const totalFailed = results.items.failed + results.parcels.failed + 
                           results.ledgers.failed + results.regularItems.failed;

        return res.json({
            success: totalFailed === 0,
            message: totalFailed === 0 
                ? "Currency migration completed successfully" 
                : `Migration completed with ${totalFailed} failures`,
            duration: `${duration}s`,
            restoreInfo: backupUrl ? "If you need to rollback, use POST /api/backup/restore?type=currency&confirm=yes" : null,
            results
        });

    } catch (err) {
        console.error("\n💥 Critical migration error:", err);
        return res.status(500).json({
            success: false,
            message: "Migration failed critically",
            error: err.message,
            restoreInfo: process.env.BACKUP_URL ? "You can restore from backup using POST /api/backup/restore?type=currency&confirm=yes" : null,
            results
        });
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