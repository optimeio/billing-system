const Leave = require("../models/Leave");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Staff/Admin
exports.applyLeave = async (req, res) => {
    try {
        const { leaveType, startDate, endDate, reason } = req.body;

        const leave = await Leave.create({
            userId: req.user._id,
            leaveType,
            startDate,
            endDate,
            reason
        });

        // Notify Admin/Owner
        const adminMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #3498db;">New Leave Application</h2>
                <p><b>Staff Name:</b> ${req.user.name}</p>
                <p><b>Leave Type:</b> ${leaveType}</p>
                <p><b>Duration:</b> ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}</p>
                <p><b>Reason:</b> ${reason}</p>
                <hr>
                <p>Please log in to the admin portal to approve or reject this request.</p>
            </div>
        `;
        
        // Send alert to admin in the background (non-blocking)
        sendEmail(process.env.EMAIL_USER, `New Leave Request - ${req.user.name}`, "", adminMessage)
            .catch(err => console.error("Failed to send admin notification for leave:", err.message));

        res.status(201).json({
            message: "Leave application submitted successfully",
            leave
        });
    } catch (error) {
        console.error("Leave application error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my leave history
// @route   GET /api/leaves/my
// @access  Staff/Admin
exports.getMyLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ userId: req.user._id }).sort({ appliedAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all leave applications (Admin)
// @route   GET /api/leaves/all
// @access  Admin Only
exports.getAllLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find()
            .populate("userId", "name email staffId")
            .sort({ appliedAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update leave status (Admin)
// @route   PATCH /api/leaves/:id/status
// @access  Admin Only
exports.updateLeaveStatus = async (req, res) => {
    try {
        const { status, adminComment } = req.body;
        const leave = await Leave.findById(req.params.id).populate("userId", "name email");

        if (!leave) {
            return res.status(404).json({ message: "Leave application not found" });
        }

        leave.status = status;
        leave.adminComment = adminComment || leave.adminComment;
        await leave.save();

        // Send Email to Staff
        const subject = `Leave Application ${status.toUpperCase()}`;
        const message = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: ${status === 'approved' ? '#27ae60' : '#e74c3c'};">Leave ${status.charAt(0).toUpperCase() + status.slice(1)}</h2>
                <p>Hello <b>${leave.userId.name}</b>,</p>
                <p>Your leave application for <b>${leave.leaveType}</b> from <b>${new Date(leave.startDate).toLocaleDateString()}</b> to <b>${new Date(leave.endDate).toLocaleDateString()}</b> has been <b>${status}</b>.</p>
                ${adminComment ? `<p><b>Admin Comment:</b> ${adminComment}</p>` : ""}
                <p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">This is an automated notification from SM GROUPS Billing System.</p>
            </div>
        `;

        // Send Email to Staff in the background (non-blocking)
        sendEmail(leave.userId.email, subject, "", message)
            .catch(emailErr => console.error("Failed to send leave status email:", emailErr.message));

        res.json({ message: `Leave ${status} successfully`, leave });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get leaves for a specific staff member (Admin)
// @route   GET /api/leaves/staff/:userId
// @access  Admin Only
exports.getStaffLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ userId: req.params.userId }).sort({ appliedAt: -1 });
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
