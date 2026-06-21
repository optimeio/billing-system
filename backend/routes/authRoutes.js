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
router.get("/temp-users", async (req, res) => {
    try {
        const User = require("../models/User");
        const users = await User.find({});
        res.json(users.map(u => ({ name: u.name, email: u.email, role: u.role, staffId: u.staffId })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;