const Expense = require("../models/Expense");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");
const fs = require("fs");
const path = require("path");
const { sendEmail } = require("../utils/emailService");


// @desc    Add new expense request
// @route   POST /api/expenses
// @access  Staff/Admin
exports.createExpense = async (req, res) => {
    try {
        const { title, description, amount, vendorName, category, paymentMethod } = req.body;
        
        let billFile = null;
        if (req.file) {
            // Save relative path for easy frontend access
            billFile = `/uploads/${req.file.filename}`;
        }

        const expense = await Expense.create({
            title,
            description,
            amount,
            vendorName,
            category,
            paymentMethod,
            billFile,
            createdBy: req.user._id,
            status: "pending"
        });

        // Notify Admin via Email
        // Send Email Notification to Admin in the background (non-blocking)
        sendEmail(process.env.EMAIL_USER, `New Expense Submitted: ${title}`, "", adminEmailMessage)
            .catch(emailErr => console.error("Failed to send admin notification email for expense:", emailErr.message));

        res.status(201).json({

            message: "Expense created successfully",
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
        
        // Staff sees only own expenses
        if (req.user.role !== "admin") {
            query.createdBy = req.user._id;
        }

        const expenses = await Expense.find(query)
            .populate("createdBy", "name email staffId")
            .populate("approvedBy", "name")
            .populate("rejectedBy", "name")
            .sort({ createdAt: -1 });

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Staff/Admin
exports.getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id)
            .populate("createdBy", "name email staffId")
            .populate("approvedBy", "name")
            .populate("rejectedBy", "name");

        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }

        if (req.user.role !== "admin" && expense.createdBy._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized" });
        }

        res.json(expense);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve expense
// @route   PATCH /api/expenses/:id/approve
// @access  Admin Only
exports.approveExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        if (expense.status !== "pending") return res.status(400).json({ message: `Expense is already ${expense.status}` });

        expense.status = "approved";
        expense.approvedBy = req.user._id;
        expense.approvedAt = Date.now();

        await expense.save();

        // Emit notification
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: expense.createdBy,
                title: "Expense Approved",
                message: `Your expense "${expense.title}" has been approved`,
                type: "expensePaid"
            });
            io.emit("expensePaid", { expense, notification });
        } catch (err) {
            console.error("Socket error on expense approve:", err);
        }

        res.json({ message: "Expense approved successfully", expense });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reject expense
// @route   PATCH /api/expenses/:id/reject
// @access  Admin Only
exports.rejectExpense = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        
        if (!expense) return res.status(404).json({ message: "Expense not found" });
        if (expense.status !== "pending") return res.status(400).json({ message: `Expense is already ${expense.status}` });

        expense.status = "rejected";
        expense.rejectedBy = req.user._id;
        expense.rejectedAt = Date.now();

        await expense.save();

        res.json({ message: "Expense rejected successfully", expense });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete own pending expense
// @route   DELETE /api/expenses/:id
// @access  Staff/Admin
exports.deleteExpense = async (req, res) => {
    try {
        console.log(`[DEBUG] Attempting to delete expense: ${req.params.id} by user: ${req.user.email} (${req.user.role})`);
        
        const expense = await Expense.findById(req.params.id);
        if (!expense) {
            console.log("[DEBUG] Expense not found");
            return res.status(404).json({ message: "Expense not found" });
        }

        // Roles that are NOT 'staff' or 'inventory' are treated as privileged (Admin, Manager, Developer, Data Analyst, etc.)
        const isPrivileged = !["staff", "inventory", "inventory_manager", "inventory manager"].includes(req.user.role);


        
        if (!isPrivileged) {
            if (expense.status !== "pending") {
                console.log(`[DEBUG] Staff (${req.user.email}) cannot delete ${expense.status} expense`);
                return res.status(400).json({ message: `Cannot delete a ${expense.status} expense. Only pending expenses can be deleted by staff.` });
            }
            if (expense.createdBy.toString() !== req.user._id.toString()) {
                console.log(`[DEBUG] Staff (${req.user.email}) not authorized to delete expense created by ${expense.createdBy}`);
                return res.status(403).json({ message: "Not authorized to delete this expense" });
            }
        }


        // Remove uploaded file if exists
        if (expense.billFile) {
            try {
                // Normalize path for Windows/Linux consistency
                const relativePath = expense.billFile.startsWith("/") ? expense.billFile.substring(1) : expense.billFile;
                const filePath = path.join(__dirname, "..", relativePath);
                
                console.log(`[DEBUG] Attempting to remove file: ${filePath}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log("[DEBUG] File removed successfully");
                } else {
                    console.log("[DEBUG] File does not exist on disk, skipping deletion");
                }
            } catch (fileErr) {
                console.error("[DEBUG] Error deleting file:", fileErr.message);
                // We don't return 500 here because we still want to delete the DB record even if file is missing
            }
        }

        await Expense.findByIdAndDelete(req.params.id);
        console.log("[DEBUG] Expense record deleted from DB");

        res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("[DEBUG] CRITICAL DELETE ERROR:", error.message);
        res.status(500).json({ message: error.message });
    }
};

