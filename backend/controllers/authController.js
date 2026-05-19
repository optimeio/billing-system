const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/emailService");
const crypto = require("crypto");

// Generate JWT Token
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

// @desc    Admin & Staff Login
// @route   POST /api/auth/login
exports.login = async (req, res) => {
    const { loginId, password } = req.body || {};

    if (!loginId || !password) {
        return res.status(400).json({ message: "Please provide Login ID (Email/Staff ID) and password" });
    }

    try {
        const user = await User.findOne({ 
            $or: [{ email: loginId }, { staffId: loginId }] 
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        if (user.isBlocked) {
            return res.status(403).json({ message: "Account is blocked" });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const token = generateToken(user._id, user.role);

        const userResponse = user.toObject();
        delete userResponse.password;
        
        userResponse.isFirstLogin = (user.role === "inventory") ? false : user.isFirstLogin;
        userResponse.otpSent = false;

        res.json({
            ...userResponse,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP for first login password change
// @route   POST /api/auth/send-first-login-otp
exports.sendFirstLoginOtp = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.isFirstLogin || user.role === "inventory") {
            return res.status(400).json({ message: "OTP not required for this account" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save({ validateBeforeSave: false });

        const message = `Your account security code is: ${otp}. Use this to set your permanent password.`;
        console.log(`[TEST] First Login OTP for ${user.email}: ${otp}`);
        console.log(`Sending OTP to: ${user.email}...`);
        await sendEmail(user.email, "Security Verification - First Login", message);
        console.log("OTP Email sent successfully.");

        res.json({ message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Change password on first login
// @route   POST /api/auth/first-login-change
exports.firstLoginChange = async (req, res) => {
    const { otp, newPassword } = req.body || {};
    const userId = req.user._id;

    if (!newPassword) {
        return res.status(400).json({ message: "Please provide a new password" });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify OTP (Skip for inventory role)
        if (user.role !== "inventory") {
            if (!user.otp || user.otp !== otp || user.otpExpiry < Date.now()) {
                return res.status(400).json({ message: "Invalid or expired OTP code" });
            }
        }

        user.password = newPassword;
        user.isFirstLogin = false;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        const userResponse = user.toObject();
        delete userResponse.password;

        res.json({ 
            message: "Password updated successfully. You can now use the system.",
            user: userResponse
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Forgot Password - Send OTP
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    const { loginId } = req.body || {};

    try {
        const user = await User.findOne({ 
            $or: [{ email: loginId }, { staffId: loginId }] 
        });

        if (!user) return res.status(404).json({ message: "No user found with this Email or Staff ID" });

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save({ validateBeforeSave: false });

        // Send Email
        const message = `Your OTP for password reset is: ${otp}. It will expire in 10 minutes.`;
        console.log(`Sending Password Reset OTP (${otp}) to: ${user.email}...`);
        await sendEmail(user.email, "Password Reset OTP", message);
        console.log("OTP Email sent successfully.");

        res.json({ message: "OTP sent to your email" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    const { email, loginId, otp } = req.body || {};

    try {
        const query = { otp, otpExpiry: { $gt: Date.now() } };
        
        if (loginId) {
            query.$or = [{ email: loginId }, { staffId: loginId }];
        } else if (email) {
            query.email = email;
        } else {
            return res.status(400).json({ message: "Email or Login ID required" });
        }

        const user = await User.findOne(query);

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        res.json({ message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    const { loginId, otp, newPassword } = req.body || {};

    try {
        const user = await User.findOne({ 
            $or: [{ email: loginId }, { staffId: loginId }],
            otp, 
            otpExpiry: { $gt: Date.now() } 
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }

        user.password = newPassword;
        user.otp = null;
        user.otpExpiry = null;
        await user.save();

        res.json({ message: "Password reset successful" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};