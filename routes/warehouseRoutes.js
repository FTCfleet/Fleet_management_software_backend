const express= require("express");
const router= express.Router();
const catchAsync= require("../utils/catchAsync.js");
const {isLoggedIn, isAdmin}= require("../middleware.js");
const warehouseController= require("../controllers/warehouseController.js");

router.route('/all-items')
    .get(catchAsync(warehouseController.getAllItems));

router.route('/get-all')
    .get(catchAsync(warehouseController.fetchAllWarehouse))

module.exports= router;