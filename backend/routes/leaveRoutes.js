const express = require("express");
const router = express.Router();
const { 
    applyLeave, 
    getMyLeaves, 
    getAllLeaves, 
    updateLeaveStatus,
    getStaffLeaves
} = require("../controllers/leaveController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require login
router.use(protect);

router.post("/", applyLeave);
router.get("/my", getMyLeaves);

// Admin only routes
router.get("/all", adminOnly, getAllLeaves);
router.get("/staff/:userId", adminOnly, getStaffLeaves);
router.patch("/:id/status", adminOnly, updateLeaveStatus);

module.exports = router;
