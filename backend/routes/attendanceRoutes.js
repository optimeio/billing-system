const express = require("express");
const router = express.Router();
const {
    checkIn,
    checkOut,
    getTodayStatus,
    getMyHistory,
    getDailyAttendance,
    markAttendance
} = require("../controllers/attendanceController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// All routes require authentication
router.use(protect);

// Staff check-in/out endpoints
router.post("/check-in", upload.single("photo"), checkIn);
router.post("/check-out", checkOut);
router.get("/today", getTodayStatus);
router.get("/my-history", getMyHistory);

// Admin-only endpoints
router.get("/daily", adminOnly, getDailyAttendance);
router.post("/mark", adminOnly, markAttendance);

module.exports = router;
