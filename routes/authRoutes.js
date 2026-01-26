const express = require('express');
const router = express.Router();
const { authenticateToken, verifyOTPToken } = require('../middleware/auth');
const catchAsync= require("../utils/catchAsync.js");
const authController= require("../controllers/authController.js");

router.route('/register')
    .post(catchAsync(authController.register));

router.route('/change-password')
    .post(authenticateToken, catchAsync(authController.changePassword));

router.route('/login')
    .post(catchAsync(authController.login));

router.route('/status')
    .get(authenticateToken, catchAsync(authController.getStatus));

router.route('/get-otp')
    .post(catchAsync(authController.getOTP));

router.route('/verify-otp')
    .post(catchAsync(authController.verifyOtp));

router.route('/reset-password')
    .post(verifyOTPToken, catchAsync(authController.resetPassword));

router.route('/get-all-users')
    .get(catchAsync(authController.getAllUsernames))

module.exports = router;