require("dotenv").config();
const mongoose = require("mongoose");

async function fixIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB...");
        
        const collection = mongoose.connection.collection("products");
        
        // Drop the existing barcode index
        try {
            await collection.dropIndex("barcode_1");
            console.log("Dropped old barcode index.");
        } catch (e) {
            console.log("Barcode index not found or already dropped.");
        }
        
        console.log("Index fix completed. Mongoose will recreate it with 'sparse' on next run.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixIndex();
