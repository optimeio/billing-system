const express = require("express");
const router = express.Router();
const {
    createPayment,
    createRazorpayOrder,
    approvePayment,
    rejectPayment,
    getPayments,
    getPaymentById
} = require("../controllers/paymentController");

const { protect: verifyToken, adminOnly: authorizeRoles } = require("../middleware/authMiddleware");

// All routes require login
router.use(verifyToken);

// Create payment requests (Admin or Staff)
router.post("/create/:invoiceId", createPayment);
router.post("/razorpay-order/:invoiceId", createRazorpayOrder);

// Admin only routes
router.patch("/:id/approve", authorizeRoles, approvePayment);
router.patch("/:id/reject", authorizeRoles, rejectPayment);
router.get("/", authorizeRoles, getPayments);
router.get("/:id", authorizeRoles, getPaymentById);

module.exports = router;
