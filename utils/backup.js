// /**
//  * Database Backup Utility
//  * 
//  * Creates a complete backup of specified collections to a backup MongoDB instance.
//  * Used before critical operations like data migrations.
//  */

// const mongoose = require('mongoose');

// /**
//  * Create a backup of collections to backup database
//  * @param {Array} collections - Array of {model, name} objects to backup
//  * @param {String} backupUrl - MongoDB connection string for backup database
//  * @returns {Object} - Backup results with counts and errors
//  */
// const createBackup = async (collections, backupUrl) => {
//     if (!backupUrl) {
//         throw new Error('BACKUP_URL is not defined in environment variables');
//     }

//     const startTime = Date.now();
//     const results = {
//         success: false,
//         timestamp: new Date().toISOString(),
//         collections: {},
//         totalDocuments: 0,
//         duration: 0,
//         errors: []
//     };

//     let backupConnection = null;

//     try {
//         console.log('🔌 Connecting to backup database...');
        
//         // Create separate connection for backup database
//         backupConnection = await mongoose.createConnection(backupUrl, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });

//         console.log('✅ Connected to backup database');

//         // Backup each collection
//         for (const { model, name } of collections) {
//             try {
//                 console.log(`\n📦 Backing up ${name}...`);
                
//                 // Fetch all documents from source
//                 const documents = await model.find({}).lean();
//                 const count = documents.length;
                
//                 console.log(`Found ${count} documents in ${name}`);
                
//                 if (count > 0) {
//                     // Get the schema from the model
//                     const BackupModel = backupConnection.model(name, model.schema);
                    
//                     // Clear existing backup data for this collection
//                     await BackupModel.deleteMany({});
//                     console.log(`Cleared existing backup data for ${name}`);
                    
//                     // Insert documents in batches to avoid memory issues
//                     const batchSize = 1000;
//                     let inserted = 0;
                    
//                     for (let i = 0; i < documents.length; i += batchSize) {
//                         const batch = documents.slice(i, i + batchSize);
//                         await BackupModel.insertMany(batch, { ordered: false });
//                         inserted += batch.length;
//                         console.log(`Inserted ${inserted}/${count} documents for ${name}`);
//                     }
                    
//                     results.collections[name] = {
//                         success: true,
//                         count: count,
//                         backedUp: inserted
//                     };
//                     results.totalDocuments += inserted;
//                     console.log(`✅ ${name} backup completed: ${inserted} documents`);
//                 } else {
//                     results.collections[name] = {
//                         success: true,
//                         count: 0,
//                         backedUp: 0
//                     };
//                     console.log(`⚠️ ${name} is empty, skipping`);
//                 }
//             } catch (err) {
//                 console.error(`❌ Error backing up ${name}:`, err.message);
//                 results.collections[name] = {
//                     success: false,
//                     error: err.message
//                 };
//                 results.errors.push(`${name}: ${err.message}`);
//             }
//         }

//         results.success = results.errors.length === 0;
//         results.duration = ((Date.now() - startTime) / 1000).toFixed(2);

//         console.log(`\n🎉 Backup completed in ${results.duration}s`);
//         console.log(`Total documents backed up: ${results.totalDocuments}`);

//     } catch (err) {
//         console.error('💥 Critical backup error:', err);
//         results.success = false;
//         results.errors.push(`Critical error: ${err.message}`);
//         throw err;
//     } finally {
//         // Close backup connection
//         if (backupConnection) {
//             await backupConnection.close();
//             console.log('🔌 Backup database connection closed');
//         }
//     }

//     return results;
// };

// /**
//  * Restore data from backup database to main database
//  * @param {Array} collections - Array of {model, name} objects to restore
//  * @param {String} backupUrl - MongoDB connection string for backup database
//  * @returns {Object} - Restore results with counts and errors
//  */
// const restoreFromBackup = async (collections, backupUrl) => {
//     if (!backupUrl) {
//         throw new Error('BACKUP_URL is not defined in environment variables');
//     }

//     const startTime = Date.now();
//     const results = {
//         success: false,
//         timestamp: new Date().toISOString(),
//         collections: {},
//         totalDocuments: 0,
//         duration: 0,
//         errors: []
//     };

//     let backupConnection = null;

//     try {
//         console.log('🔌 Connecting to backup database...');
        
//         backupConnection = await mongoose.createConnection(backupUrl, {
//             useNewUrlParser: true,
//             useUnifiedTopology: true
//         });

//         console.log('✅ Connected to backup database');

//         // Restore each collection
//         for (const { model, name } of collections) {
//             try {
//                 console.log(`\n📦 Restoring ${name}...`);
                
//                 // Get backup model
//                 const BackupModel = backupConnection.model(name, model.schema);
                
//                 // Fetch all documents from backup
//                 const documents = await BackupModel.find({}).lean();
//                 const count = documents.length;
                
//                 console.log(`Found ${count} documents in backup for ${name}`);
                
//                 if (count > 0) {
//                     // Clear existing data in main database
//                     await model.deleteMany({});
//                     console.log(`Cleared existing data in ${name}`);
                    
//                     // Insert documents in batches
//                     const batchSize = 1000;
//                     let inserted = 0;
                    
//                     for (let i = 0; i < documents.length; i += batchSize) {
//                         const batch = documents.slice(i, i + batchSize);
//                         await model.insertMany(batch, { ordered: false });
//                         inserted += batch.length;
//                         console.log(`Restored ${inserted}/${count} documents for ${name}`);
//                     }
                    
//                     results.collections[name] = {
//                         success: true,
//                         count: count,
//                         restored: inserted
//                     };
//                     results.totalDocuments += inserted;
//                     console.log(`✅ ${name} restore completed: ${inserted} documents`);
//                 } else {
//                     results.collections[name] = {
//                         success: true,
//                         count: 0,
//                         restored: 0
//                     };
//                     console.log(`⚠️ ${name} backup is empty, skipping`);
//                 }
//             } catch (err) {
//                 console.error(`❌ Error restoring ${name}:`, err.message);
//                 results.collections[name] = {
//                     success: false,
//                     error: err.message
//                 };
//                 results.errors.push(`${name}: ${err.message}`);
//             }
//         }

//         results.success = results.errors.length === 0;
//         results.duration = ((Date.now() - startTime) / 1000).toFixed(2);

//         console.log(`\n🎉 Restore completed in ${results.duration}s`);
//         console.log(`Total documents restored: ${results.totalDocuments}`);

//     } catch (err) {
//         console.error('💥 Critical restore error:', err);
//         results.success = false;
//         results.errors.push(`Critical error: ${err.message}`);
//         throw err;
//     } finally {
//         if (backupConnection) {
//             await backupConnection.close();
//             console.log('🔌 Backup database connection closed');
//         }
//     }

//     return results;
// };

// module.exports = {
//     createBackup,
//     restoreFromBackup
// };
