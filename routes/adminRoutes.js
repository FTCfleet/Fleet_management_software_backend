const express= require("express");
const router= express.Router();
const catchAsync= require("../utils/catchAsync.js");
const adminController= require("../controllers/adminController.js")
const { authenticateToken, isAdmin, isSupervisor } = require('../middleware/auth');

router.route('/get-all-employees')
    .get(authenticateToken, isAdmin, catchAsync(adminController.fetchAllEmployees));

router.route('/get-all-drivers')
    .get(authenticateToken, isAdmin, catchAsync(adminController.fetchAllDrivers));

router.route('/get-all-warehouses')
    .get(authenticateToken, catchAsync(adminController.fetchAllWarehouses));

router.route('/manage/driver')
    .post(authenticateToken, isAdmin, catchAsync(adminController.addDriver))
    .put(authenticateToken, isAdmin, catchAsync(adminController.updateDriver))
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteDriver));

router.route('/manage/employee')
    .put(authenticateToken, isAdmin, catchAsync(adminController.updateEmployee))
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteEmployee));

router.route('/manage/warehouse')
    .post(authenticateToken, isAdmin, catchAsync(adminController.addWarehouse))
    .put(authenticateToken, isAdmin, catchAsync(adminController.updateWarehouse))
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteWarehouse));

router.route('/manage/parcel')
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteParcel));

router.route('/manage/ledger')
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteLedger));

router.route('/manage/regular-item')
    .get(authenticateToken, catchAsync(adminController.getAllRegularItems))
    .post(authenticateToken, isAdmin, catchAsync(adminController.addNewRegularItems))
    .put(authenticateToken, isAdmin, catchAsync(adminController.editRegularItems))
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteRegularItem));

router.route('/manage/regular-client')
    .get(authenticateToken, catchAsync(adminController.getAllRegularClients))
    .post(authenticateToken, isAdmin, catchAsync(adminController.addNewRegularClient))
    .put(authenticateToken, isAdmin, catchAsync(adminController.editRegularClient))
    .delete(authenticateToken, isAdmin, catchAsync(adminController.deleteRegularClient));

router.route('/regular-client-items/:id')
    .get(authenticateToken, catchAsync(adminController.getItemForRegularClient));

module.exports= router;