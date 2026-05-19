const Announcement = require("../models/Announcement");
const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");
const { getIO } = require("../utils/socketService");

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Admin Only
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, content, isGlobal, recipients } = req.body;

        const announcement = await Announcement.create({
            senderId: req.user._id,
            title,
            content,
            isGlobal: isGlobal === undefined ? true : isGlobal,
            recipients: isGlobal ? [] : recipients
        });

        // Fetch recipients for email
        let emails = [];
        if (isGlobal) {
            const users = await User.find({ role: { $ne: "admin" } }).select("email");
            emails = users.map(u => u.email);
        } else {
            const users = await User.find({ _id: { $in: recipients } }).select("email");
            emails = users.map(u => u.email);
        }

        // Send Emails
        const emailSubject = `New Announcement: ${title}`;
        const emailMessage = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                <h2 style="color: #2c3e50;">Official Announcement</h2>
                <h3 style="color: #3498db;">${title}</h3>
                <p>${content}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 0.8em; color: #7f8c8d;">You can view and reply to this message in your staff portal.</p>
            </div>
        `;

        // Send email to all recipients
        emails.forEach(email => {
            sendEmail(email, emailSubject, "", emailMessage).catch(err => console.error("Email error:", err));
        });

        // Socket Notification
        try {
            const io = getIO();
            io.emit("newAnnouncement", announcement);
        } catch (err) {}

        res.status(201).json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get announcements for user
// @route   GET /api/announcements
// @access  Staff/Admin
exports.getAnnouncements = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== "admin") {
            // Staff see global ones or ones they are a recipient of
            query = {
                $or: [
                    { isGlobal: true },
                    { recipients: req.user._id }
                ]
            };
        }

        const announcements = await Announcement.find(query)
            .populate("senderId", "name role")
            .populate("replies.senderId", "name role")
            .sort({ createdAt: -1 });

        res.json(announcements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reply to announcement
// @route   POST /api/announcements/:id/reply
// @access  Staff/Admin
exports.addReply = async (req, res) => {
    try {
        const { message, replyToAll } = req.body;
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }

        announcement.replies.push({
            senderId: req.user._id,
            message,
            replyToAll: replyToAll || false
        });

        await announcement.save();

        // Socket update
        try {
            const io = getIO();
            io.emit("announcementUpdate", announcement);
        } catch (err) {}

        res.json(announcement);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
