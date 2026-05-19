const Scanner = require("../models/Scanner");
const Invoice = require("../models/Invoice");
const User = require("../models/User");

// @desc    Get all scanners (Admin View)
// @route   GET /api/admin/scanners
// @access  Admin Only
exports.getAllScanners = async (req, res) => {
    try {
        const { status, search } = req.query;
        let query = {};

        // 1. Filter by Status
        if (status) {
            query.status = status;
        }

        // 2. Search feature
        if (search) {
            // Find matching invoices
            const invoices = await Invoice.find({
                $or: [
                    { invoiceNumber: { $regex: search, $options: "i" } },
                    { customerName: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const invoiceIds = invoices.map(i => i._id);

            // Find matching staff members
            const staff = await User.find({
                name: { $regex: search, $options: "i" }
            }).select("_id");
            const staffIds = staff.map(s => s._id);

            // Apply search condition
            query.$or = [
                { invoiceId: { $in: invoiceIds } },
                { staffId: { $in: staffIds } }
            ];
        }

        const scanners = await Scanner.find(query)
            .populate("invoiceId", "invoiceNumber customerName grandTotal")
            .populate("staffId", "name email")
            .populate("scannedBy", "name")
            .populate("verifiedBy", "name")
            .sort({ createdAt: -1 });

        res.json(scanners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get full scanner details
// @route   GET /api/admin/scanners/:id
// @access  Admin Only
exports.getScannerDetails = async (req, res) => {
    try {
        const scanner = await Scanner.findById(req.params.id)
            .populate({
                path: "invoiceId",
                populate: {
                    path: "items.productId",
                    select: "name barcode"
                }
            })
            .populate("staffId", "name email staffId role")
            .populate("scannedBy", "name")
            .populate("verifiedBy", "name");

        if (!scanner) {
            return res.status(404).json({ message: "Scanner not found" });
        }

        res.json(scanner);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Scanner
// @route   PATCH /api/admin/scanners/:id/verify
// @access  Admin Only
exports.verifyScanner = async (req, res) => {
    try {
        const { remarks } = req.body;
        const scanner = await Scanner.findById(req.params.id);

        if (!scanner) {
            return res.status(404).json({ message: "Scanner not found" });
        }

        if (scanner.status === "verified") {
            return res.status(400).json({ message: "Scanner is already verified" });
        }

        scanner.status = "verified";
        scanner.verifiedBy = req.user._id;
        scanner.verifiedAt = Date.now();
        if (remarks) {
            scanner.remarks = remarks;
        }

        await scanner.save();

        // Update the linked Invoice status to 'paid' when scanner is verified
        if (scanner.invoiceId) {
            await Invoice.findByIdAndUpdate(scanner.invoiceId, { paymentStatus: "paid" });
        }

        res.json({
            message: "Scanner verified successfully and Invoice marked as PAID",
            scanner
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
