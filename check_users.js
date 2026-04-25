require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./backend/models/User");

const checkUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({ role: { $ne: "admin" } });
        console.log("Registered Staff Members:");
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, StaffID: ${u.staffId}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkUsers();
