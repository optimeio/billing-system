require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;

    // Fix all invoices that have no type field - set them to "invoice"
    const result = await db.collection('invoices').updateMany(
        { type: { $exists: false } },
        { $set: { type: "invoice" } }
    );
    console.log(`Fixed ${result.modifiedCount} invoices with missing 'type' field.`);

    // Also fix invoices where type is null
    const result2 = await db.collection('invoices').updateMany(
        { type: null },
        { $set: { type: "invoice" } }
    );
    console.log(`Fixed ${result2.modifiedCount} invoices with null 'type' field.`);

    // Verify
    const invoices = await db.collection('invoices').find({}, { 
        projection: { invoiceNumber: 1, type: 1 } 
    }).toArray();
    console.log(`\n=== All invoices after fix ===`);
    invoices.forEach(inv => {
        console.log(`  ${inv.invoiceNumber}  |  type: ${inv.type}`);
    });

    process.exit(0);
})();
