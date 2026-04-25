require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB for seeding...");

        // Clear existing users? (Optional, maybe not for production)
        // await User.deleteMany({});

        const users = [
            {
                name: "Admin User",
                email: "thesmgroups@gmail.com",
                staffId: "ADMIN001",
                password: "TSMGPVT@2026",
                role: "admin",
                isFirstLogin: false
            },
            {
                name: "Inventory Staff",
                email: "theoptime.io@gmail.com", // Used unique email
                staffId: "INV001",
                password: "TSMG1997",
                role: "inventory",
                isFirstLogin: false
            }
        ];

        for (let u of users) {
            const exists = await User.findOne({ staffId: u.staffId });
            if (!exists) {
                await User.create(u);
                console.log(`Created user: ${u.name} (${u.role})`);
            } else {
                // Update existing user to match seed data
                await User.findOneAndUpdate({ staffId: u.staffId }, u);
                console.log(`Updated user: ${u.name} (${u.role})`);
            }
        }

        console.log("Seeding completed!");
        process.exit();
    } catch (error) {
        console.error("Seeding error:", error);
        process.exit(1);
    }
};

seedUsers();
