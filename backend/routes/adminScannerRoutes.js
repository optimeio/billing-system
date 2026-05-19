const express = require("express");
const router = express.Router();
const {
    getAllScanners,
    getScannerDetails,
    verifyScanner
} = require("../controllers/adminScannerController");

const { protect: verifyToken, adminOnly: authorizeRoles } = require("../middleware/authMiddleware");

// All admin scanner routes require login and ADMIN role
router.use(verifyToken, authorizeRoles);

// Get all scanners (with search & filters)
router.get("/", getAllScanners);

// Get full details of a specific scanner
router.get("/:id", getScannerDetails);

// Mark scanner as verified
router.patch("/:id/verify", verifyScanner);

module.exports = router;
