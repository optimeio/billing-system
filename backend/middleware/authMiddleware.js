const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            req.user = await User.findById(decoded.id).select("-password");
            
            if (!req.user) {
                return res.status(401).json({ message: "User not found" });
            }

            if (req.user.isBlocked) {
                return res.status(403).json({ message: "Your account is blocked. Please contact admin." });
            }

            next();
        } catch (error) {
            res.status(401).json({ message: `Not authorized, token failed: ${error.message}` });
        }
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Role (${req.user.role}) is not allowed to access this resource`
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
