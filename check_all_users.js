require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./backend/models/User");

const checkAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await User.find({});
        console.log("All Registered Users in Database:");
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, StaffID: ${u.staffId}, Role: ${u.role}, isFirstLogin: ${u.isFirstLogin}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkAllUsers();
