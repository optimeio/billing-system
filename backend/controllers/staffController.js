const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");
const Notification = require("../models/Notification");
const { getIO } = require("../utils/socketService");

// @desc    Create new staff (Admin Only)
// @route   POST /api/staff/create
exports.createStaff = async (req, res) => {
    const { name, email, phone, staffId, password, role } = req.body;

    try {
        const userExists = await User.findOne({ 
            $or: [{ email }, { staffId }, { phone }] 
        });

        if (userExists) {
            return res.status(400).json({ message: "User with this Email, Phone, or Staff ID already exists" });
        }

        const user = await User.create({
            name,
            email,
            phone,
            staffId,
            password, // Will be hashed by pre-save hook
            role: role || "staff",
            isFirstLogin: (role === "inventory") ? false : true
        });

        if (user) {
            // Send welcome email to staff
            const staffMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #2c3e50;">Welcome to SM GROUPS</h2>
                    <p>Hello <b>${name}</b>,</p>
                    <p>Your account has been successfully created by the administrator. You can now access the Billing Software with the following credentials:</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border-left: 5px solid #3498db;">
                        <p><b>Staff ID:</b> ${staffId}</p>
                        <p><b>Temporary Password:</b> ${password}</p>
                    </div>
                    <p style="color: #e74c3c; margin-top: 15px;"><b>Important:</b> You will be required to change your password immediately after your first login for security purposes.</p>
                    <div style="text-align: center; margin-top: 25px;">
                        <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 12px 25px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Portal</a>
                    </div>
                    <p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">If you did not expect this email, please contact the administrator at ${process.env.EMAIL_USER}.</p>
                </div>
            `;
            
            // Send to Staff
            await sendEmail(user.email, "Welcome to SM GROUPS - Your Account Credentials", "", staffMessage);

            // Send confirmation to Admin (Owner)
            const adminMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                    <h2 style="color: #2c3e50;">Staff Account Created</h2>
                    <p>The following staff account has been created successfully:</p>
                    <ul>
                        <li><b>Name:</b> ${name}</li>
                        <li><b>Email:</b> ${email}</li>
                        <li><b>Staff ID:</b> ${staffId}</li>
                        <li><b>Role:</b> ${role || "staff"}</li>
                    </ul>
                    <p>The staff member has been sent an email with their login credentials.</p>
                </div>
            `;
            // Note: sendEmail already BCCs process.env.EMAIL_USER, but we send a specific one to the creating admin too if it's different
            if (req.user.email !== process.env.EMAIL_USER) {
                await sendEmail(req.user.email, "Staff Creation Confirmation", "", adminMessage);
            }

            res.status(201).json({
                message: "Staff created successfully and welcome email sent",
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    staffId: user.staffId,
                    role: user.role
                }
            });
        }
    } catch (error) {
        console.error("Staff creation error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all staff (Admin Only)
// @route   GET /api/staff/all
exports.getAllStaff = async (req, res) => {
    try {
        const staff = await User.find({ role: { $ne: "admin" } }).select("-password");
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Block Staff
// @route   PATCH /api/staff/block/:id
exports.blockStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = true;
        await user.save();

        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: user._id,
                title: "Account Blocked",
                message: "Your account has been blocked by an admin.",
                type: "staffBlocked"
            });
            io.emit("staffBlocked", { user, notification });
        } catch (err) {
            console.error("Socket error on staff block:", err);
        }

        res.json({ message: "Staff blocked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unblock Staff
// @route   PATCH /api/staff/unblock/:id
exports.unblockStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        user.isBlocked = false;
        await user.save();

        try {
            const io = getIO();
            const notification = await Notification.create({
                userId: user._id,
                title: "Account Unblocked",
                message: "Your account has been unblocked. You can now log in.",
                type: "staffUnblocked"
            });
            io.emit("staffUnblocked", { user, notification });
        } catch (err) {
            console.error("Socket error on staff unblock:", err);
        }

        res.json({ message: "Staff unblocked successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Single Staff (Admin Only)
// @route   GET /api/staff/:id
exports.getStaffById = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id).select("-password");
        if (!staff) return res.status(404).json({ message: "Staff member not found" });
        res.json(staff);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Staff (Admin Only)
// @route   PUT /api/staff/:id
exports.updateStaff = async (req, res) => {
    const { name, email, phone, staffId, role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Staff member not found" });

        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.staffId = staffId || user.staffId;
        user.role = role || user.role;

        const updatedUser = await user.save();
        res.json({
            message: "Staff updated successfully",
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Staff (Admin Only)
// @route   DELETE /api/staff/:id
exports.deleteStaff = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Staff member not found" });

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Staff member removed permanently" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
