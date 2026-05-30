const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ─── Verify JWT Token ─────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ message: "User not found. Please log in again." });
            }

            if (req.user.isBlocked) {
                return res.status(403).json({ message: "Your account is blocked. Please contact admin." });
            }

            return next();
        } catch (error) {
            console.error("[Auth] Token verification failed:", error.message);
            return res.status(401).json({ message: "Not authorized. Token is invalid or expired. Please log in again." });
        }
    }

    // No token provided
    return res.status(401).json({ message: "Not authorized. No token provided. Please log in." });
};

// ─── Role Authorization ───────────────────────────────────────────────────────
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Access denied. Role (${req.user?.role || "unknown"}) is not permitted to access this resource.`
            });
        }
        next();
    };
};

const adminOnly = authorizeRoles("admin");

module.exports = {
    protect,
    adminOnly,
    verifyToken: protect,
    authorizeRoles
};
