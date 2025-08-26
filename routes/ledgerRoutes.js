const express = require("express");
const catchAsync = require("../utils/catchAsync.js");
const router = express.Router();
const ledgerController = require("../controllers/ledgerController.js");
const { authenticateToken, isAppUser, isSupervisor } = require('../middleware/auth');

router.route('/new')
    .post(authenticateToken, catchAsync(ledgerController.createLedger));

router.route('/generate-ledger-receipt/:id')
    .get(catchAsync(ledgerController.generatePDF))

router.route('/track/:id')
    .get(authenticateToken, isSupervisor, catchAsync(ledgerController.trackLedger));

router.route('/generate-excel/:destination/:month')
    .get(catchAsync(ledgerController.generateExcel))

router.route('/track-all/:date')
    .get(authenticateToken, catchAsync(ledgerController.getLedgersByDate));

router.route('/edit/:id')
    .put(authenticateToken, isSupervisor, catchAsync(ledgerController.editLedger));

router.route('/scan-deliver')
    .post(authenticateToken, isAppUser, catchAsync(ledgerController.deliverLedger));

router.route('/verify-deliver/:id')
    .put(authenticateToken, isSupervisor, catchAsync(ledgerController.verifyLedger));

module.exports = router;