require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function runAudit() {
    console.log("Starting DB Audit...");
    console.log("Connecting to:", process.env.MONGODB_URI ? "URI is set" : "URI is MISSING");
    
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });
        console.log("✅ Connected to MongoDB successfully.");
        
        const allUsers = await User.find({});
        console.log(`\nTotal Users in DB: ${allUsers.length}`);
        console.log("--------------------------------------------------------------------------------");
        
        for (const user of allUsers) {
            console.log(`Name: ${user.name}`);
            console.log(`Email: ${user.email}`);
            console.log(`Staff ID: ${user.staffId}`);
            console.log(`Role: ${user.role}`);
            console.log(`Blocked: ${user.isBlocked}`);
            console.log(`First Login: ${user.isFirstLogin}`);
            console.log(`Password Hash: ${user.password}`);
            
            // Let's test standard passwords to see if any match the hash
            const testPasswords = ["TSMGPVT@2026", "TSMG1997", "123456", "password", "staff123", "password123"];
            let foundMatch = false;
            for (const pw of testPasswords) {
                const match = await bcrypt.compare(pw, user.password);
                if (match) {
                    console.log(`   👉 Matches password: "${pw}"`);
                    foundMatch = true;
                    break;
                }
            }
            if (!foundMatch) {
                console.log("   👉 Matches password: None of the common test passwords matched!");
            }
            console.log("--------------------------------------------------------------------------------");
        }
        
        await mongoose.connection.close();
        console.log("Disconnected from MongoDB.");
    } catch (err) {
        console.error("❌ DB Audit error:", err);
    }
}

runAudit();
