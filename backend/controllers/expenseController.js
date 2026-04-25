const Expense = require("../models/Expense");

// @desc    Upload an expense/purchase request with QR
// @route   POST /api/expenses
// @access  Staff/Admin
exports.createExpense = async (req, res) => {
    try {
        const { title, amount, category, vendorName, qrImage, description } = req.body;

        if (!qrImage) {
            return res.status(400).json({ message: "Vendor payment QR Image is required" });
        }

        const expense = await Expense.create({
            title,
            amount,
            category,
            vendorName,
            qrImage, // Expecting a base64 string from frontend
            description,
            recordedBy: req.user._id,
            status: "pending"
        });

        res.status(201).json({
            message: "Purchase request submitted successfully. Waiting for Admin payment.",
            expense
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Staff/Admin
exports.getExpenses = async (req, res) => {
    try {
        let query = {};
        
        // Staff can only see their own requests
        if (req.user.role !== "admin") {
            query.recordedBy = req.user._id;
        }

        const expenses = await Expense.find(query)
            .populate("recordedBy", "name email")
            .populate("paidBy", "name")
            .sort({ createdAt: -1 });

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark expense as paid (Admin scans the QR and pays offline)
// @route   PATCH /api/expenses/:id/pay
// @access  Admin Only
exports.markPaid = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        
        if (!expense) {
            return res.status(404).json({ message: "Expense request not found" });
        }

        if (expense.status === "paid") {
            return res.status(400).json({ message: "This expense has already been paid" });
        }

        expense.status = "paid";
        expense.paidBy = req.user._id;
        expense.paidAt = Date.now();

        await expense.save();

        res.json({
            message: "Expense marked as paid successfully",
            expense
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
