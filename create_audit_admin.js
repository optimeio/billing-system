const mongoose = require("mongoose");
const User = require("./backend/models/User");
require("dotenv").config();

async function createAuditAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Delete if exists
        await User.deleteOne({ email: "audit_admin@smgroups.com" });

        const admin = new User({
            name: "Audit Administrator",
            email: "audit_admin@smgroups.com",
            phone: "9876543210",
            staffId: "AUDIT001",
            password: "AuditPass123!",
            role: "admin",
            isFirstLogin: false
        });

        await admin.save();
        console.log("✅ Audit Admin created successfully!");
        console.log("Email: audit_admin@smgroups.com");
        console.log("Password: AuditPass123!");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

createAuditAdmin();
