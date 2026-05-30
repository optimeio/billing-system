/**
 * reset_admin.js – Resets passwords for admin and inventory accounts.
 * Run with: node reset_admin.js
 *
 * Uses user.save() so bcrypt pre-save hook properly hashes the new password.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("✅ Connected to DB");

        // 1. Reset Main Admin
        const adminEmail = "thesmgroups@gmail.com";
        let admin = await User.findOne({ email: adminEmail });
        if (admin) {
            admin.password = "TSMGPVT@2026";  // will be hashed by pre-save hook
            admin.isFirstLogin = false;
            admin.isBlocked = false;
            if (!admin.phone) admin.phone = "1234567890";
            await admin.save();
            console.log(`✅ Password reset for admin: ${adminEmail} → TSMGPVT@2026`);
        } else {
            // Create admin if not exists
            admin = new User({
                name: "SM Groups Admin",
                email: adminEmail,
                phone: "1234567890",
                staffId: "ADMIN_MAIN",
                password: "TSMGPVT@2026",
                role: "admin",
                isFirstLogin: false
            });
            await admin.save();
            console.log(`✅ Admin created: ${adminEmail}`);
        }

        // 2. Reset Inventory Manager
        const inventoryEmail = "theoptime.io@gmail.com";
        let inventory = await User.findOne({ email: inventoryEmail });
        if (inventory) {
            inventory.password = "TSMG1997";  // will be hashed by pre-save hook
            inventory.isFirstLogin = false;
            inventory.isBlocked = false;
            if (!inventory.phone) inventory.phone = "1234567890";
            await inventory.save();
            console.log(`✅ Password reset for inventory: ${inventoryEmail} → TSMG1997`);
        } else {
            inventory = new User({
                name: "Inventory Manager",
                email: inventoryEmail,
                phone: "1234567890",
                staffId: "INV_MAIN",
                password: "TSMG1997",
                role: "inventory",
                isFirstLogin: false
            });
            await inventory.save();
            console.log(`✅ Inventory manager created: ${inventoryEmail}`);
        }

        console.log("\n✅ Done! Login credentials:");
        console.log("─────────────────────────────────────────────────");
        console.log("Admin:     thesmgroups@gmail.com    /  TSMGPVT@2026");
        console.log("Inventory: theoptime.io@gmail.com    /  TSMG1997");
        console.log("─────────────────────────────────────────────────");
        process.exit();
    })
    .catch(err => {
        console.error("❌ Error:", err.message);
        process.exit(1);
    });
