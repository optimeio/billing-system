const mongoose = require("mongoose");
const User = require("./backend/models/User");
require("dotenv").config();

async function bypassFirstLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const admin = await User.findOne({ email: "theoptime.io@gmail.com" });
        if (admin) {
            admin.isFirstLogin = false;
            await admin.save();
            console.log("✅ Admin first-login bypass successful!");
        } else {
            console.log("❌ Admin user not found.");
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error("Error:", error);
    }
}

bypassFirstLogin();
