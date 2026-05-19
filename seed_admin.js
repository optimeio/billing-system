require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./backend/models/User");

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const adminExists = await User.findOne({ role: "admin" });
        if (adminExists) {
            console.log("Admin already exists:", adminExists.email);
        } else {
            const admin = new User({
                name: "System Admin",
                email: "admin@smgroups.com",
                password: "Admin@2026",
                role: "admin",
                staffId: "ADMIN001",
                isFirstLogin: false
            });
            await admin.save();
            console.log("Admin user created successfully!");
            console.log("Email: admin@smgroups.com");
            console.log("Password: Admin@2026");
        }
        
        // Also check if there are any staff
        const staffCount = await User.countDocuments({ role: "staff" });
        console.log(`Current Staff Count: ${staffCount}`);
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
