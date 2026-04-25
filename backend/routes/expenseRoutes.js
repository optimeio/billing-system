const express = require("express");
const router = express.Router();
const {
    createExpense,
    getExpenses,
    markPaid
} = require("../controllers/expenseController");

const { protect, adminOnly } = require("../middleware/authMiddleware");

// All routes require login
router.use(protect);

// Upload a vendor QR code for an expense
router.post("/", createExpense);

// List expenses (Admin: all, Staff: own)
router.get("/", getExpenses);

// Admin only: Mark the expense/vendor QR as paid
router.patch("/:id/pay", adminOnly, markPaid);

module.exports = router;
