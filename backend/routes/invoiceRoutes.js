const express = require("express");
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    cancelInvoice,
    downloadInvoice
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
    .post(createInvoice)
    .get(getInvoices);

router.get("/:id", getInvoiceById);
router.get("/:id/download", downloadInvoice);
router.patch("/:id/cancel", cancelInvoice);

module.exports = router;
