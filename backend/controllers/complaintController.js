const Complaint = require("../models/Complaint");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Private (Staff/Inventory)
exports.createComplaint = async (req, res) => {
    try {
        const { subject, description } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ message: "Subject and description are required." });
        }

        const complaint = await Complaint.create({
            userId: req.user._id,
            subject,
            description
        });

        // Populate user details for immediate socket emit/use
        const populatedComplaint = await Complaint.findById(complaint._id)
            .populate("userId", "name email staffId role");

        // Create Admin Notification
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: null, // Global notification for Admin
                title: "New Complaint Submitted",
                message: `${req.user.name} (${req.user.role}) has submitted a complaint: "${subject}"`,
                type: "general"
            });
            // Broadcast live socket event to Admin
            io.emit("complaintCreated", { complaint: populatedComplaint, notification });
        } catch (err) {
            console.error("Socket error on complaint creation:", err);
        }

        res.status(201).json({
            message: "Complaint submitted successfully! It has been forwarded to the Admin.",
            complaint
        });
    } catch (error) {
        console.error("Create complaint error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user's submitted complaints
// @route   GET /api/complaints/my
// @access  Private (Staff/Inventory)
exports.getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ userId: req.user._id })
            .populate("resolvedBy", "name email")
            .sort({ createdAt: -1 });

        res.json(complaints);
    } catch (error) {
        console.error("Get my complaints error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all complaints (Admin Only)
// @route   GET /api/complaints/admin
// @access  Private (Admin Only)
exports.getAdminComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({})
            .populate("userId", "name email staffId role")
            .populate("resolvedBy", "name email")
            .sort({ createdAt: -1 });

        res.json(complaints);
    } catch (error) {
        console.error("Get admin complaints error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Resolve a complaint (Admin Only)
// @route   PATCH /api/complaints/:id/resolve
// @access  Private (Admin Only)
exports.resolveComplaint = async (req, res) => {
    try {
        const { resolutionNotes } = req.body;
        
        if (!resolutionNotes) {
            return res.status(400).json({ message: "Resolution notes are required." });
        }

        const complaint = await Complaint.findById(req.params.id);

        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found." });
        }

        if (complaint.status === "resolved") {
            return res.status(400).json({ message: "This complaint is already resolved." });
        }

        complaint.status = "resolved";
        complaint.resolutionNotes = resolutionNotes;
        complaint.resolvedBy = req.user._id;
        complaint.resolvedAt = new Date();

        await complaint.save();

        const populatedComplaint = await Complaint.findById(complaint._id)
            .populate("userId", "name email staffId role")
            .populate("resolvedBy", "name email");

        // Create notification for the complaining user
        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: complaint.userId,
                title: "Complaint Resolved",
                message: `Your complaint regarding "${complaint.subject}" has been marked as resolved by Admin.`,
                type: "general"
            });
            // Send live update to user
            io.emit("notification", notification);
            io.emit("complaintResolved", populatedComplaint);
        } catch (err) {
            console.error("Socket error on complaint resolution:", err);
        }

        res.json({
            message: "Complaint resolved successfully.",
            complaint: populatedComplaint
        });
    } catch (error) {
        console.error("Resolve complaint error:", error);
        res.status(500).json({ message: error.message });
    }
};
