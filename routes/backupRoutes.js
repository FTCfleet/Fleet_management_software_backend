// /**
//  * Backup and Restore Routes
//  * 
//  * Provides endpoints for backing up and restoring database collections
//  * before critical operations like migrations.
//  */

// const express = require('express');
// const router = express.Router();
// const { createBackup, restoreFromBackup } = require('../utils/backup.js');

// // Import models
// const Item = require('../models/itemSchema.js');
// const Parcel = require('../models/parcelSchema.js');
// const Ledger = require('../models/ledgerSchema.js');
// const RegularItem = require('../models/regularItemSchema.js');
// const Client = require('../models/clientSchema.js');
// const RegularClient = require('../models/regularClientSchema.js');
// const Employee = require('../models/employeeSchema.js');
// const Warehouse = require('../models/warehouseSchema.js');
// const Driver = require('../models/driverSchema.js');
// const ItemType = require('../models/itemTypeSchema.js');

// // Define collections to backup
// const ALL_COLLECTIONS = [
//     { model: Item, name: 'Item' },
//     { model: Parcel, name: 'Parcel' },
//     { model: Ledger, name: 'Ledger' },
//     { model: RegularItem, name: 'RegularItem' },
//     { model: Client, name: 'Client' },
//     { model: RegularClient, name: 'RegularClient' },
//     { model: Employee, name: 'Employee' },
//     { model: Warehouse, name: 'Warehouse' },
//     { model: Driver, name: 'Driver' },
//     { model: ItemType, name: 'ItemType' }
// ];

// // Collections affected by currency migration
// const CURRENCY_COLLECTIONS = [
//     { model: Item, name: 'Item' },
//     { model: Parcel, name: 'Parcel' },
//     { model: Ledger, name: 'Ledger' },
//     { model: RegularItem, name: 'RegularItem' }
// ];

// /**
//  * POST /api/backup/create
//  * Create a backup of all collections
//  * 
//  * Query params:
//  * - type: 'all' (default) or 'currency' (only currency-related collections)
//  */
// router.post('/create', async (req, res) => {
//     try {
//         const backupUrl = process.env.BACKUP_URL;
        
//         if (!backupUrl) {
//             return res.status(500).json({
//                 success: false,
//                 message: 'BACKUP_URL is not configured in environment variables'
//             });
//         }

//         const { type = 'all' } = req.query;
//         const collections = type === 'currency' ? CURRENCY_COLLECTIONS : ALL_COLLECTIONS;

//         console.log(`\n🚀 Starting ${type} backup...`);
//         console.log(`Collections to backup: ${collections.map(c => c.name).join(', ')}`);

//         const results = await createBackup(collections, backupUrl);

//         return res.json({
//             success: results.success,
//             message: results.success 
//                 ? `Backup completed successfully. ${results.totalDocuments} documents backed up.`
//                 : `Backup completed with errors. ${results.errors.length} errors occurred.`,
//             results
//         });

//     } catch (err) {
//         console.error('Backup route error:', err);
//         return res.status(500).json({
//             success: false,
//             message: 'Backup failed',
//             error: err.message
//         });
//     }
// });

// /**
//  * POST /api/backup/restore
//  * Restore data from backup database
//  * 
//  * Query params:
//  * - type: 'all' (default) or 'currency' (only currency-related collections)
//  * 
//  * WARNING: This will DELETE all current data and replace with backup!
//  */
// router.post('/restore', async (req, res) => {
//     try {
//         const backupUrl = process.env.BACKUP_URL;
        
//         if (!backupUrl) {
//             return res.status(500).json({
//                 success: false,
//                 message: 'BACKUP_URL is not configured in environment variables'
//             });
//         }

//         const { type = 'all', confirm } = req.query;

//         // Safety check - require confirmation
//         if (confirm !== 'yes') {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Restore operation requires confirmation. Add ?confirm=yes to the URL.',
//                 warning: 'This will DELETE all current data and replace with backup data!'
//             });
//         }

//         const collections = type === 'currency' ? CURRENCY_COLLECTIONS : ALL_COLLECTIONS;

//         console.log(`\n🚀 Starting ${type} restore...`);
//         console.log(`Collections to restore: ${collections.map(c => c.name).join(', ')}`);
//         console.log('⚠️ WARNING: This will delete current data!');

//         const results = await restoreFromBackup(collections, backupUrl);

//         return res.json({
//             success: results.success,
//             message: results.success 
//                 ? `Restore completed successfully. ${results.totalDocuments} documents restored.`
//                 : `Restore completed with errors. ${results.errors.length} errors occurred.`,
//             results
//         });

//     } catch (err) {
//         console.error('Restore route error:', err);
//         return res.status(500).json({
//             success: false,
//             message: 'Restore failed',
//             error: err.message
//         });
//     }
// });

// /**
//  * GET /api/backup/status
//  * Check backup database connection and get collection counts
//  */
// router.get('/status', async (req, res) => {
//     const mongoose = require('mongoose');
//     let backupConnection = null;

//     try {
//         const backupUrl = process.env.BACKUP_URL;
        
//         if (!backupUrl) {
//             return res.status(500).json({
//                 success: false,
//                 message: 'BACKUP_URL is not configured in environment variables'
//             });
//         }

//         // Test connection
//         backupConnection = await mongoose.createConnection(backupUrl, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true,
//             serverSelectionTimeoutMS: 5000
//         });

//         const collections = {};
        
//         // Get counts from backup database
//         for (const { model, name } of ALL_COLLECTIONS) {
//             try {
//                 const BackupModel = backupConnection.model(name, model.schema);
//                 const count = await BackupModel.countDocuments();
//                 collections[name] = { count, status: 'ok' };
//             } catch (err) {
//                 collections[name] = { count: 0, status: 'error', error: err.message };
//             }
//         }

//         await backupConnection.close();

//         return res.json({
//             success: true,
//             message: 'Backup database is accessible',
//             backupUrl: backupUrl.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'), // Hide password
//             collections
//         });

//     } catch (err) {
//         if (backupConnection) {
//             await backupConnection.close();
//         }
        
//         return res.status(500).json({
//             success: false,
//             message: 'Cannot connect to backup database',
//             error: err.message
//         });
//     }
// });

// module.exports = router;
