/**
 * seed.js – Creates or resets admin + inventory users.
 * Run with: node seed.js
 *
 * IMPORTANT: Uses user.save() (not findOneAndUpdate) so bcrypt pre-save hook runs.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB for seeding...");

        const users = [
            {
                name: "SM Groups Admin",
                email: "thesmgroups@gmail.com",
                phone: "9488316728",
                staffId: "ADMIN_MAIN",
                password: "TSMGPVT@2026",
                role: "admin",
                isFirstLogin: false
            },
            {
                name: "Official Administrator",
                email: "tsmgmdofficial@gmail.com",
                phone: "9488316728",
                staffId: "ADMIN_OFFICIAL",
                password: "TSMG1997",
                role: "admin",
                isFirstLogin: false
            },
            {
                name: "Inventory Manager",
                email: "theoptime.io@gmail.com",
                phone: "9488316728",
                staffId: "INV_MAIN",
                password: "TSMG1997",
                role: "inventory_manager",
                isFirstLogin: false
            },
            {
                name: "Nithyashree T",
                email: "shreenithya111@gmail.com",
                phone: "9488316728",
                staffId: "SM003",
                password: "StaffPassword123",
                role: "staff",
                isFirstLogin: false
            }
        ];

        for (let u of users) {
            let user = await User.findOne({ $or: [{ email: u.email }, { staffId: u.staffId }] });
            if (!user) {
                // Create new user — pre-save hook hashes password
                user = new User(u);
                await user.save();
                console.log(`✅ Created user: ${u.name} (${u.role}) — email: ${u.email}`);
            } else {
                // Update fields and re-save to trigger pre-save hook for password hashing
                user.name = u.name;
                user.email = u.email;
                user.phone = u.phone || user.phone;
                user.staffId = u.staffId;
                user.password = u.password;  // will be re-hashed by pre-save hook
                user.role = u.role;
                user.isFirstLogin = u.isFirstLogin;
                user.isBlocked = false;
                await user.save();
                console.log(`✅ Updated user: ${u.name} (${u.role}) — email: ${u.email}`);
            }
        }

        console.log("\n✅ Seeding completed successfully!");
        console.log("\nLogin Credentials:");
        console.log("──────────────────────────────────────────────────────────────────");
        console.log("Main Admin:        thesmgroups@gmail.com  /  TSMGPVT@2026");
        console.log("Extra Admin:       tsmgmdofficial@gmail.com  /  TSMG1997");
        console.log("Inventory Manager: theoptime.io@gmail.com  /  TSMG1997 (role: inventory_manager)");
        console.log("Staff:             shreenithya111@gmail.com  /  StaffPassword123");
        console.log("──────────────────────────────────────────────────────────────────");
        process.exit();
    } catch (error) {
        console.error("❌ Seeding error:", error.message);
        process.exit(1);
    }
};

seedUsers();
