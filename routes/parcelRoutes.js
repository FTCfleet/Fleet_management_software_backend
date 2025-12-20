const express = require("express");
const router = express.Router();
const catchAsync = require("../utils/catchAsync.js");
const parcelController = require("../controllers/parcelController.js");
const { authenticateToken, isSupervisor, isAppUser } = require("../middleware/auth.js");

router.route('/new')
    .post(authenticateToken, isSupervisor, catchAsync(parcelController.newParcel));

router.route('/track/:id')
    .get(catchAsync(parcelController.trackParcel));

router.route('/generate-qr/:id')
    .get(catchAsync(parcelController.generateQRCodes))

router.route('/all')
    .post(authenticateToken, isSupervisor, catchAsync(parcelController.allParcel));

router.route('/generate-lr-receipt/:id')
    .get(catchAsync(parcelController.generateLR))

router.route('/generate-lr-receipt-thermal/:id')
    .get(catchAsync(parcelController.generateLRThermal))

router.route('/edit/:id')
    .put(authenticateToken, isSupervisor, catchAsync(parcelController.editParcel))

//forApp
router.route('/get-parcels')
    .get(authenticateToken, isAppUser, catchAsync(parcelController.getParcelsForApp))

module.exports = router;