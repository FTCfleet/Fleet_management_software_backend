const express= require("express");
const catchAsync = require("../utils/catchAsync.js");
const router= express.Router();
const driverController= require("../controllers/driverController.js");

router.route('/new')
    .post(catchAsync(driverController.newDriver))

router.route('/all-truck-no')
    .get(catchAsync(driverController.allTruckNo));

module.exports= router;