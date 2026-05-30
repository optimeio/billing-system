const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/emailService");
const crypto = require("crypto");

// admin → admin, inventory → inventory, everything else → staff
const normalizeRole = (role) => {
    if (!role) return "staff";
    const r = role.toLowerCase().trim();
    if (r === "admin") return "admin";
    if (r === "inventory" || r === "inventory_manager" || r === "inventory manager") return "inventory";
    return "staff";
};

// ─── Generate JWT Token ───────────────────────────────────────────────────────
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// ─── @desc  Admin & Staff Login ───────────────────────────────────────────────
// ─── @route POST /api/auth/login
exports.login = async (req, res) => {
    let { loginId, password } = req.body || {};

    // Sanitize inputs
    if (loginId) loginId = loginId.trim();
    if (password) password = password.trim();

    if (!loginId || !password) {
        return res.status(400).json({ message: "Please provide Email/Staff ID and password" });
    }

    try {
        // Email lookup is case-insensitive; staffId lookup is exact
        const isEmail = loginId.includes("@");
        const query = isEmail
            ? { email: loginId.toLowerCase() }
            : { staffId: loginId };

        const user = await User.findOne(query);

        if (!user) {
            console.log(`[Auth] ✗ Login failed – user not found: ${loginId}`);
            return res.status(401).json({ message: "Incorrect Email or Password" });
        }

        if (user.isBlocked) {
            console.log(`[Auth] ✗ Login failed – account blocked: ${user.email}`);
            return res.status(403).json({ message: "Your account has been blocked. Please contact admin." });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            console.log(`[Auth] ✗ Login failed – wrong password for: ${loginId}`);
            return res.status(401).json({ message: "Incorrect Email or Password" });
        }



        const userResponse = user.toObject();
        delete userResponse.password;
        delete userResponse.otp;
        delete userResponse.otpExpiry;

        // For inventory role, skip isFirstLogin prompt
        userResponse.isFirstLogin = (normalizeRole(user.role) === "inventory") ? false : user.isFirstLogin;

        return res.status(200).json({
            message: "Login Successful",
            token,
            user: userResponse,
        });
    } catch (error) {
        console.error("[Auth] Login error:", error.message);
        return res.status(500).json({ message: "Server error. Please try again later." });
    }
};

// ─── @desc  Send OTP for first login password change ─────────────────────────
// ─── @route POST /api/auth/send-first-login-otp
exports.sendFirstLoginOtp = async (req, res) => {
    const userId = req.user._id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (!user.isFirstLogin || normalizeRole(user.role) === "inventory") {
            return res.status(400).json({ message: "OTP not required for this account" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save({ validateBeforeSave: false });

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
              <h2 style="color:#dc2626;margin-bottom:8px">SM Groups – Security Verification</h2>
              <p style="color:#374151">Hello <strong>${user.name}</strong>,</p>
              <p style="color:#374151">Your one-time security code for first login is:</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;padding:20px;background:#f9fafb;border-radius:8px;margin:16px 0">${otp}</div>
              <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>`;

        console.log(`[Auth] First-login OTP for ${user.email}: ${otp}`);
        await sendEmail(user.email, "SM Groups – Security Verification Code", null, html);

        return res.json({ message: "OTP sent to your registered email" });
    } catch (error) {
        console.error("[Auth] sendFirstLoginOtp error:", error.message);
        return res.status(500).json({ message: "Failed to send OTP. Please try again." });
    }
};

// ─── @desc  Change password on first login ───────────────────────────────────
// ─── @route POST /api/auth/first-login-change
exports.firstLoginChange = async (req, res) => {
    const { otp, newPassword } = req.body || {};
    const userId = req.user._id;

    if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Verify OTP (skip for inventory role)
        if (normalizeRole(user.role) !== "inventory") {
            if (!otp) return res.status(400).json({ message: "OTP is required" });
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
        delete userResponse.otp;
        delete userResponse.otpExpiry;

        return res.json({
            message: "Password updated successfully. You can now use the system.",
            user: userResponse
        });
    } catch (error) {
        console.error("[Auth] firstLoginChange error:", error.message);
        return res.status(500).json({ message: "Failed to update password. Please try again." });
    }
};

// ─── @desc  Forgot Password – Send OTP to email ──────────────────────────────
// ─── @route POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
    let { loginId } = req.body || {};
    if (!loginId) return res.status(400).json({ message: "Please provide your Email or Staff ID" });
    loginId = loginId.trim();

    try {
        const isEmail = loginId.includes("@");
        const query = isEmail
            ? { email: loginId.toLowerCase() }
            : { staffId: loginId };

        const user = await User.findOne(query);

        // Security: always respond the same way whether user exists or not
        if (!user) {
            console.log(`[Auth] Forgot password – account not found: ${loginId}`);
            return res.json({ message: "If an account exists with that email/ID, an OTP has been sent." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save({ validateBeforeSave: false });

        const html = `
            <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px">
              <h2 style="color:#dc2626;margin-bottom:8px">SM Groups – Password Reset</h2>
              <p style="color:#374151">Hello <strong>${user.name}</strong>,</p>
              <p style="color:#374151">Your password reset OTP is:</p>
              <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;padding:20px;background:#f9fafb;border-radius:8px;margin:16px 0">${otp}</div>
              <p style="color:#6b7280;font-size:13px">This code expires in <strong>10 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.</p>
            </div>`;

        console.log(`[Auth] Password reset OTP for ${user.email}: ${otp}`);

        try {
            await sendEmail(user.email, "SM Groups – Password Reset OTP", null, html);
            return res.json({ message: "OTP sent to your registered email. Please check your inbox." });
        } catch (emailErr) {
            console.error("[Auth] Failed to send reset OTP email:", emailErr.message);
            return res.status(500).json({ message: "Failed to send OTP email. Please check your email address or try again later." });
        }
    } catch (error) {
        console.error("[Auth] forgotPassword error:", error.message);
        return res.status(500).json({ message: "Failed to process request. Please try again." });
    }
};

// ─── @desc  Verify OTP ────────────────────────────────────────────────────────
// ─── @route POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    let { email, loginId, otp } = req.body || {};
    if (!otp) return res.status(400).json({ message: "OTP is required" });

    try {
        const query = { otp, otpExpiry: { $gt: Date.now() } };

        if (loginId) {
            const isEmail = loginId.includes("@");
            if (isEmail) {
                query.email = loginId.toLowerCase();
            } else {
                query.staffId = loginId;
            }
        } else if (email) {
            query.email = email.toLowerCase();
        } else {
            return res.status(400).json({ message: "Email or Login ID is required" });
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP. Please try again." });
        }

        return res.json({ message: "OTP verified successfully" });
    } catch (error) {
        console.error("[Auth] verifyOtp error:", error.message);
        return res.status(500).json({ message: "Server error. Please try again." });
    }
};

// ─── @desc  Reset Password ────────────────────────────────────────────────────
// ─── @route POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
    let { loginId, otp, newPassword } = req.body || {};

    if (!loginId || !otp || !newPassword) {
        return res.status(400).json({ message: "loginId, OTP and newPassword are all required" });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    loginId = loginId.trim();

    try {
        const isEmail = loginId.includes("@");
        const query = {
            otp,
            otpExpiry: { $gt: Date.now() }
        };
        if (isEmail) {
            query.email = loginId.toLowerCase();
        } else {
            query.staffId = loginId;
        }

        const user = await User.findOne(query);
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired OTP. Please request a new one." });
        }

        user.password = newPassword; // pre-save hook will hash this
        user.otp = null;
        user.otpExpiry = null;
        // Generate JWT token after successful password verification
        const token = generateToken(user._id, user.role);
        console.log(`[Auth] ✓ Login successful: ${user.email} (${user.role})`);
        await user.save();

        console.log(`[Auth] ✓ Password reset successful for: ${user.email}`);
        return res.json({ message: "Password reset successful. You can now log in with your new password." });
    } catch (error) {
        console.error("[Auth] resetPassword error:", error.message);
        return res.status(500).json({ message: "Failed to reset password. Please try again." });
    }
};