require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to DB");
        const users = await User.find({});
        console.log("Users found:", users.length);
        users.forEach(u => console.log(`- ${u.email} (${u.role})` || `- No Email (${u.staffId})`));
        process.exit();
    })
    .catch(err => {
        console.error("Connection error:", err);
        process.exit(1);
    });
