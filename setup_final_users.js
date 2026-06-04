const mongoose = require("./backend/node_modules/mongoose");
const User = require("./backend/models/User");
require("dotenv").config();

async function setupUsers() {
    try {
        console.log("Connecting to:", process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 30) + "..." : "undefined");
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log("Connected to MongoDB");

        // Admin User
        const adminEmail = "thesmgroups@gmail.com";
        await User.deleteOne({ email: adminEmail });
        const admin = new User({
            name: "Main Administrator",
            email: adminEmail,
            phone: "9876543210",
            staffId: "ADMIN_MAIN",
            password: "TSMG1997",
            role: "admin",
            isFirstLogin: false
        });
        await admin.save();
        console.log("✅ Admin Created: thesmgroups@gmail.com / TSMG1997");

        // Extra Admin User
        const extraAdminEmail = "tsmgmdofficial@gmail.com";
        await User.deleteOne({ email: extraAdminEmail });
        const extraAdmin = new User({
            name: "Official Administrator",
            email: extraAdminEmail,
            phone: "9876543212",
            staffId: "ADMIN_OFFICIAL",
            password: "TSMG1997",
            role: "admin",
            isFirstLogin: false
        });
        await extraAdmin.save();
        console.log("✅ Extra Admin Created: tsmgmdofficial@gmail.com / TSMG1997");

        // Inventory User
        const invEmail = "theoptime.io@gmail.com";
        await User.deleteOne({ email: invEmail });
        const inventory = new User({
            name: "Inventory Manager",
            email: invEmail,
            phone: "9876543211",
            staffId: "INV_MAIN",
            password: "TSMG1997",
            role: "inventory",
            isFirstLogin: false
        });
        await inventory.save();
        console.log("✅ Inventory Manager Created: theoptime.io@gmail.com / TSMG1997");

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

setupUsers();
