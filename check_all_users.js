require("dotenv").config();
const mongoose = require("./backend/node_modules/mongoose");
const User = require("./backend/models/User");

const checkAllUsers = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 20000
        });
        console.log("Connected to MongoDB successfully!");
        const users = await User.find({});
        console.log("All Registered Users in Database:");
        users.forEach(u => {
            console.log(`- Name: ${u.name}, Email: ${u.email}, StaffID: ${u.staffId}, Role: ${u.role}, isFirstLogin: ${u.isFirstLogin}`);
        });
        process.exit();
    } catch (err) {
        console.error("Connection/Query Error:", err);
        process.exit(1);
    }
};

checkAllUsers();
