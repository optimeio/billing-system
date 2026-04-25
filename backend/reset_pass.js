require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const resetStaffPassword = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ staffId: "DEV003" });
        if (user) {
            user.password = "123456";
            if (!user.phone) user.phone = "0000000000"; // Add dummy phone if missing
            await user.save();
            console.log("SUCCESS: Password for DEV003 has been reset to: 123456");
        } else {
            console.log("ERROR: Staff ID DEV003 not found.");
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

resetStaffPassword();
