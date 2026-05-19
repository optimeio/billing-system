const Notification = require("../models/Notification");

// @desc    Get all notifications for user (or all if admin)
// @route   GET /api/notifications
// @access  Admin/Staff
exports.getNotifications = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== "admin") {
            // Staff sees their own notifications and global ones
            query = { $or: [{ userId: req.user._id }, { userId: null }] };
        } // Admin sees all

        const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Admin/Staff
exports.markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ message: "Notification not found" });
        }

        notification.isRead = true;
        await notification.save();

        res.json({ message: "Notification marked as read", notification });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
