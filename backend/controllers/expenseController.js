const Expense = require("../models/Expense");
const Notification = require("../models/Notification");
const User = require("../models/User");
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
        let scannerFile = null;
        if (req.files) {
            if (req.files.billFile && req.files.billFile[0]) {
                billFile = `/uploads/${req.files.billFile[0].filename}`;
            }
            if (req.files.scannerFile && req.files.scannerFile[0]) {
                scannerFile = `/uploads/${req.files.scannerFile[0].filename}`;
            }
        }

        const expense = await Expense.create({
            title,
            description,
            amount,
            vendorName,
            category,
            paymentMethod,
            billFile,
            scannerFile,
            createdBy: req.user._id,
            status: "pending"
        });

        // Notify Admin via Email
        const adminEmailMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2c3e50;">New Expense Request</h2>
                <p>A new expense request has been submitted for approval:</p>
                <ul>
                    <li><b>Title:</b> ${title}</li>
                    <li><b>Amount:</b> ₹${parseFloat(amount).toLocaleString()}</li>
                    <li><b>Submitted By:</b> ${req.user.name || "Staff"}</li>
                    <li><b>Category:</b> ${category || "General"}</li>
                </ul>
                <p>Please log in to the admin panel to approve or reject this request.</p>
            </div>
        `;

        // Send Email Notification to Admin in the background (non-blocking)
        sendEmail(process.env.EMAIL_USER, `New Expense Submitted: ${title}`, "", adminEmailMessage)
            .catch(emailErr => console.error("Failed to send admin notification email for expense:", emailErr.message));

        try {
            const io = getIO();
            io.emit("expenseCreated", expense);
        } catch (err) {
            console.error("Socket error on expense create:", err);
        }

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

        // Send Email Notification to Staff
        try {
            const creator = await User.findById(expense.createdBy).select("name email");
            if (creator && creator.email) {
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
                        <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Expense Request Approved</p>
                      </div>
                      <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${creator.name}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your expense request has been <strong>APPROVED</strong> by the administrator. Below are the details:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                          <tbody>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Title / Reason</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${expense.title}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Amount</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: bold;">₹${parseFloat(expense.amount).toLocaleString()}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Category</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${expense.category || "General"}</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Status</td>
                              <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: bold;">APPROVED</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                `;
                sendEmail(creator.email, `Expense Approved: ${expense.title}`, "", emailHtml)
                    .catch(emailErr => console.error("Failed to send expense approval email:", emailErr.message));
            }
        } catch (fetchErr) {
            console.error("Failed to fetch creator for email notification:", fetchErr.message);
        }

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

        // Send Email Notification to Staff
        try {
            const creator = await User.findById(expense.createdBy).select("name email");
            if (creator && creator.email) {
                const emailHtml = `
                    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                      <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
                        <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
                        <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Expense Request Rejected</p>
                      </div>
                      <div style="padding: 24px; background-color: #ffffff;">
                        <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${creator.name}</strong>,</p>
                        <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your expense request has been <strong style="color: #dc2626;">REJECTED</strong> by the administrator. Below are the details:</p>
                        
                        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                          <tbody>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Title / Reason</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${expense.title}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Amount</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: bold;">₹${parseFloat(expense.amount).toLocaleString()}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #e2e8f0;">
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Category</td>
                              <td style="padding: 10px; text-align: right; color: #1e293b;">${expense.category || "General"}</td>
                            </tr>
                            <tr>
                              <td style="padding: 10px; color: #475569; font-weight: 600;">Status</td>
                              <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: bold;">REJECTED</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                `;
                sendEmail(creator.email, `Expense Rejected: ${expense.title}`, "", emailHtml)
                    .catch(emailErr => console.error("Failed to send expense rejection email:", emailErr.message));
            }
        } catch (fetchErr) {
            console.error("Failed to fetch creator for email notification:", fetchErr.message);
        }

        try {
            const io = getIO();
            io.emit("expenseRejected", expense);
        } catch (err) {
            console.error("Socket error on expense reject:", err);
        }

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


        // Remove uploaded files if they exist
        const filesToDelete = [expense.billFile, expense.scannerFile];
        filesToDelete.forEach(f => {
            if (f) {
                try {
                    // Normalize path for Windows/Linux consistency
                    const relativePath = f.startsWith("/") ? f.substring(1) : f;
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
                }
            }
        });

        await Expense.findByIdAndDelete(req.params.id);

        try {
            const io = getIO();
            io.emit("expenseDeleted", { id: req.params.id });
        } catch (err) {
            console.error("Socket error on expense delete:", err);
        }

        res.json({ message: "Expense deleted successfully" });
    } catch (error) {
        console.error("[DEBUG] CRITICAL DELETE ERROR:", error.message);
        res.status(500).json({ message: error.message });
    }
};

