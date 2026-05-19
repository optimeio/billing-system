require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to DB");
        
        // Update password for the existing admin
        // 1. Update Main Admin
        const adminEmail = "thesmgroups@gmail.com";
        const admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.password = "TSMG1997";
            admin.isFirstLogin = false;
            if (!admin.phone) admin.phone = "1234567890";
            await admin.save();
            console.log(`Password set for ${adminEmail} to: TSMG1997`);
        }

        // 2. Update Inventory Admin
        const inventoryEmail = "theoptime.io@gmail.com";
        const inventory = await User.findOne({ email: inventoryEmail });
        if (inventory) {
            inventory.password = "TSMG1997";
            inventory.isFirstLogin = false;
            if (!inventory.phone) inventory.phone = "1234567890";
            await inventory.save();
            console.log(`Password set for ${inventoryEmail} to: TSMG1997`);
        } else {
            console.log("Inventory admin not found in DB.");
        }
        
        process.exit();
    })
    .catch(err => {
        console.error("Error:", err);
        process.exit(1);
    });
