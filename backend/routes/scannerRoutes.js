const express = require("express");
const router = express.Router();
const {
    generateScanner,
    getScanners,
    getScannerById,
    markScanned,
    getByInvoice
} = require("../controllers/scannerController");

// Alias to match user's requested names while using existing middleware
const { protect: verifyToken, adminOnly: authorizeRoles } = require("../middleware/authMiddleware");

// All routes require login
router.use(verifyToken);

// Generate QR
router.post("/generate/:invoiceId", generateScanner);

// Get Scanners
router.get("/", getScanners);
router.get("/:id", getScannerById);
router.get("/invoice/:invoiceId", getByInvoice);

// Anyone (Staff or Admin) can mark as scanned
router.patch("/:id/scan", markScanned);

module.exports = router;
