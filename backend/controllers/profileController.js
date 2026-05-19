const User = require("../models/User");
const fs = require("fs");
const path = require("path");

// @desc    Get logged user profile
// @route   GET /api/profile/me
// @access  Private
exports.getMyProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update profile details
// @route   PUT /api/profile/me
// @access  Private
exports.updateMyProfile = async (req, res) => {
    try {
        const { name, phone, address } = req.body;
        
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.address = address || user.address;

        const updatedUser = await user.save();
        
        // Remove password before sending response
        const userResponse = updatedUser.toObject();
        delete userResponse.password;

        res.json({
            message: "Profile updated successfully",
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload profile image
// @route   POST /api/profile/upload-pic
// @access  Private
exports.uploadProfilePic = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Delete old profile picture if it exists
        if (user.profilePic) {
            const oldPath = path.join(__dirname, "..", user.profilePic);
            if (fs.existsSync(oldPath)) {
                fs.unlinkSync(oldPath);
            }
        }

        // Save new profile picture path
        user.profilePic = `/uploads/${req.file.filename}`;
        await user.save();

        res.json({
            message: "Profile picture uploaded successfully",
            profilePic: user.profilePic
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
