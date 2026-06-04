require("dotenv").config();
const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

async function clearDB() {
    try {
        console.log("Connecting to database using native Mongoose connection...");
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        console.log("Connected to MongoDB successfully!");

        const db = mongoose.connection.db;

        // 1. Delete all documents in other collections using native driver to bypass Mongoose buffering
        const collectionsToClear = [
            "invoices",
            "products",
            "categories",
            "expenses",
            "payments",
            "notifications",
            "leaves",
            "announcements",
            "scanners",
            "stocklogs",
            "stock_logs",
            "auditlogs",
            "audit_logs"
        ];

        console.log("Clearing all billing data collections via native MongoDB driver...");
        for (const colName of collectionsToClear) {
            try {
                const countBefore = await db.collection(colName).countDocuments();
                if (countBefore > 0) {
                    await db.collection(colName).deleteMany({});
                    console.log(`  ✅ Cleared native collection: ${colName} (was ${countBefore} docs)`);
                } else {
                    console.log(`  ℹ️ Native collection ${colName} is already empty.`);
                }
            } catch (e) {
                console.log(`  ⚠️ Collection ${colName} does not exist or error clearing: ${e.message}`);
            }
        }

        // 2. Clear non-admin/non-inventory users in the "users" collection
        console.log("Clearing non-admin/non-inventory users...");
        const allowedRoles = ["admin", "inventory", "inventory_manager", "inventory manager"];
        const usersCol = db.collection("users");
        
        const countBeforeUsers = await usersCol.countDocuments();
        const deleteUsersResult = await usersCol.deleteMany({
            role: { $nin: allowedRoles }
        });
        console.log(`  ✅ Deleted ${deleteUsersResult.deletedCount} non-admin/non-inventory users (was ${countBeforeUsers} users).`);

        // 3. Ensure the admin and inventory manager exist and have correct passwords
        console.log("Resetting/Ensuring default admin and inventory users...");

        const adminPasswordHash = await bcrypt.hash("TSMG1997", 10);
        const adminEmail = "thesmgroups@gmail.com";
        const adminUserObj = {
            name: "SM Groups Admin",
            email: adminEmail,
            phone: "1234567890",
            staffId: "ADMIN_MAIN",
            password: adminPasswordHash,
            role: "admin",
            isBlocked: false,
            isFirstLogin: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const existingAdmin = await usersCol.findOne({ email: adminEmail });
        if (existingAdmin) {
            await usersCol.updateOne(
                { email: adminEmail },
                { 
                    $set: { 
                        password: adminPasswordHash,
                        role: "admin",
                        isBlocked: false,
                        isFirstLogin: false,
                        updatedAt: new Date()
                    } 
                }
            );
            console.log("  ✅ Admin user password reset successfully.");
        } else {
            await usersCol.insertOne(adminUserObj);
            console.log("  ✅ Admin user created successfully.");
        }

        // Extra Admin User
        const extraAdminEmail = "tsmgmdofficial@gmail.com";
        const extraAdminUserObj = {
            name: "Official Administrator",
            email: extraAdminEmail,
            phone: "1234567890",
            staffId: "ADMIN_OFFICIAL",
            password: adminPasswordHash,
            role: "admin",
            isBlocked: false,
            isFirstLogin: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const existingExtraAdmin = await usersCol.findOne({ email: extraAdminEmail });
        if (existingExtraAdmin) {
            await usersCol.updateOne(
                { email: extraAdminEmail },
                { 
                    $set: { 
                        password: adminPasswordHash,
                        role: "admin",
                        isBlocked: false,
                        isFirstLogin: false,
                        updatedAt: new Date()
                    } 
                }
            );
            console.log("  ✅ Extra admin user password reset successfully.");
        } else {
            await usersCol.insertOne(extraAdminUserObj);
            console.log("  ✅ Extra admin user created successfully.");
        }

        const inventoryPasswordHash = await bcrypt.hash("TSMG1997", 10);
        const inventoryEmail = "theoptime.io@gmail.com";
        const inventoryUserObj = {
            name: "Inventory Manager",
            email: inventoryEmail,
            phone: "1234567890",
            staffId: "INV_MAIN",
            password: inventoryPasswordHash,
            role: "inventory",
            isBlocked: false,
            isFirstLogin: false,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const existingInventory = await usersCol.findOne({ email: inventoryEmail });
        if (existingInventory) {
            await usersCol.updateOne(
                { email: inventoryEmail },
                { 
                    $set: { 
                        password: inventoryPasswordHash,
                        role: "inventory",
                        isBlocked: false,
                        isFirstLogin: false,
                        updatedAt: new Date()
                    } 
                }
            );
            console.log("  ✅ Inventory manager password reset successfully.");
        } else {
            await usersCol.insertOne(inventoryUserObj);
            console.log("  ✅ Inventory manager created successfully.");
        }

        // 4. Clear physical upload files
        console.log("Clearing uploads folder files...");
        const uploadsDir = path.join(__dirname, "backend", "uploads");
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`  Deleted upload file: ${file}`);
                } catch (e) {
                    console.error(`  Failed to delete ${file}:`, e.message);
                }
            }
        }
        console.log("✅ Uploads cleared.");

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB. Database clearance successfully completed via native MongoDB driver!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error during database clearance:", error);
        process.exit(1);
    }
}

clearDB();
