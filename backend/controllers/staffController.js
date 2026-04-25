const User = require("../models/User");
const { sendEmail } = require("../utils/emailService");

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
            // Send welcome email
            const message = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
                    <h2 style="color: #2c3e50;">Welcome to SM GROUPS</h2>
                    <p>Hello <b>${name}</b>,</p>
                    <p>Your account has been successfully created. You can now access the Billing Software with the following credentials:</p>
                    <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                        <p><b>Staff ID:</b> ${staffId}</p>
                        <p><b>Temporary Password:</b> ${password}</p>
                    </div>
                    <p style="color: #e74c3c;"><b>Note:</b> You will be required to change your password immediately after your first login for security purposes.</p>
                    <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">Login to Portal</a>
                    <p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">If you did not expect this email, please contact the administrator.</p>
                </div>
            `;
            await sendEmail(user.email, "Welcome to SM GROUPS - Your Account is Ready", "", message);

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
    const { name, email, role } = req.body;
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: "Staff member not found" });

        user.name = name || user.name;
        user.email = email || user.email;
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
