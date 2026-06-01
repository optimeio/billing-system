const express = require("express");
const router = express.Router();
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    cancelInvoice,
    markInvoiceAsPaid,
    downloadInvoice,
    deleteInvoice,
    updateInvoice
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

router.route("/")
    .post(createInvoice)
    .get(getInvoices);

router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.get("/:id/download", downloadInvoice);
router.patch("/:id/cancel", cancelInvoice);
router.patch("/:id/paid", markInvoiceAsPaid);
router.delete("/:id", deleteInvoice);

module.exports = router;
