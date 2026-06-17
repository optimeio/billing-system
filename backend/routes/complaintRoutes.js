const express = require("express");
const router = express.Router();
const {
    createComplaint,
    getMyComplaints,
    getAdminComplaints,
    resolveComplaint
} = require("../controllers/complaintController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// User routes
router.post("/", createComplaint);
router.get("/my", getMyComplaints);

// Admin-only routes
router.get("/admin", adminOnly, getAdminComplaints);
router.patch("/:id/resolve", adminOnly, resolveComplaint);

module.exports = router;
