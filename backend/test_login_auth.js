require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const test = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const email = "thesmgroups@gmail.com";
        const password = "TSMGPVT@2026";

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log("User not found!");
            process.exit(1);
        }

        console.log("User found in DB:", {
            email: user.email,
            role: user.role,
            passwordHash: user.password
        });

        const isMatch = await bcrypt.compare(password, user.password);
        console.log("Direct bcrypt.compare match:", isMatch);

        const methodMatch = await user.comparePassword(password);
        console.log("User.comparePassword method match:", methodMatch);

        process.exit(0);
    } catch (err) {
        console.error("Test error:", err);
        process.exit(1);
    }
};

test();
