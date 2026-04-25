const express = require("express");
const router = express.Router();
const { 
    login, 
    firstLoginChange, 
    forgotPassword, 
    verifyOtp, 
    resetPassword 
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/login", login);
router.post("/first-login-change", protect, firstLoginChange);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

module.exports = router;