require("dotenv").config();
const mongoose = require("./backend/node_modules/mongoose");
const User = require("./backend/models/User");

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        
        const adminExists = await User.findOne({ email: "admin@smgroups.com" });
        if (adminExists) {
            console.log("Admin already exists:", adminExists.email);
        } else {
            const admin = new User({
                name: "System Admin",
                email: "admin@smgroups.com",
                phone: "1234567890",
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

        const extraAdminExists = await User.findOne({ email: "tsmgmdofficial@gmail.com" });
        if (extraAdminExists) {
            console.log("Extra Admin already exists:", extraAdminExists.email);
        } else {
            const extraAdmin = new User({
                name: "Official Administrator",
                email: "tsmgmdofficial@gmail.com",
                phone: "1234567890",
                password: "TSMG1997",
                role: "admin",
                staffId: "ADMIN_OFFICIAL",
                isFirstLogin: false
            });
            await extraAdmin.save();
            console.log("Extra Admin user created successfully!");
            console.log("Email: tsmgmdofficial@gmail.com");
            console.log("Password: TSMG1997");
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
