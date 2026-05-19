const mongoose = require("mongoose");
const User = require("./backend/models/User");
require("dotenv").config();

async function setupUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
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
