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
    updateInvoice,
    approveQuotation,
    rejectQuotation,
    updateApprovalPhoto
} = require("../controllers/invoiceController");
const { protect } = require("../middleware/authMiddleware");

// All routes are protected
router.use(protect);

const upload = require("../middleware/uploadMiddleware");

router.post("/upload-approval-photo", upload.single("photo"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Please upload a photo" });
    }
    res.json({ photoPath: `/uploads/${req.file.filename}` });
});

router.route("/")
    .post(createInvoice)
    .get(getInvoices);

router.get("/:id", getInvoiceById);
router.put("/:id", updateInvoice);
router.patch("/:id/approval-photo", updateApprovalPhoto);
router.get("/:id/download", downloadInvoice);
router.patch("/:id/cancel", cancelInvoice);
router.patch("/:id/paid", markInvoiceAsPaid);
router.patch("/:id/approve-quotation", approveQuotation);
router.patch("/:id/reject-quotation", rejectQuotation);
router.delete("/:id", deleteInvoice);

module.exports = router;
