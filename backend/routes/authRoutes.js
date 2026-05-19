const express = require("express");
const router = express.Router();
const { 
    login,
    sendFirstLoginOtp,
    firstLoginChange,
    forgotPassword,
    verifyOtp, 
    resetPassword
} = require("../controllers/authController");
const { verifyToken } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/send-first-login-otp", verifyToken, sendFirstLoginOtp);
router.post("/first-login-change", verifyToken, firstLoginChange);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;