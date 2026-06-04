const express = require("express");
const router = express.Router();
const { 
    calculatePayslip, 
    generatePayslip, 
    getPayslipHistory,
    downloadPayslip,
    deletePayslip
} = require("../controllers/payslipController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(protect);

// Admin-only endpoints for processing and generation
router.get("/calculate", adminOnly, calculatePayslip);
router.post("/generate", adminOnly, generatePayslip);
router.delete("/:id", adminOnly, deletePayslip);

// Shared endpoint for retrieving history (role-filtered in the controller)
router.get("/history", getPayslipHistory);
router.get("/:id/download", downloadPayslip);

module.exports = router;
