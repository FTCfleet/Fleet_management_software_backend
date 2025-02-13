const express = require("express");
const catchAsync = require("../utils/catchAsync.js");
const router = express.Router();
const Ledger = require("../models/ledgerSchema.js")
const ledgerController = require("../controllers/ledgerController.js");
const { authenticateToken } = require('../middleware/auth');

router.route('/new')
    .post(authenticateToken, catchAsync(ledgerController.newLedger));

router.route('/generate-ledger-receipt/:id')
    .get(catchAsync(ledgerController.generatePDF))

router.route('/track/:id')
    .get(catchAsync(ledgerController.trackLedger));

router.route('/generate-excel/:dateRange')
    .get(catchAsync(ledgerController.generateExcel))

router.route('/track-all/:date')
    .get(catchAsync(ledgerController.getLedgersByDate));

router.route('/edit/:id')
    .put(catchAsync(ledgerController.editLedger));

router.route('/scan-deliver/:id')
        .post(catchAsync(ledgerController.deliverLedger));

router.route('/verify-deliver/:id')
    .put(catchAsync(ledgerController.verifyLedger));
    

module.exports = router;