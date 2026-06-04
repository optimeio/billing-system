require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    
    // 1. Show all invoices and their type/invoiceNumber
    const invoices = await db.collection('invoices').find({}, { 
        projection: { invoiceNumber: 1, type: 1 } 
    }).toArray();
    
    console.log(`\n=== Total invoices in DB: ${invoices.length} ===\n`);
    invoices.forEach(inv => {
        console.log(`  ${inv.invoiceNumber}  |  type: ${inv.type || '(MISSING)'}`);
    });

    // 2. Check for INV1001 specifically
    const inv1001 = await db.collection('invoices').findOne({ invoiceNumber: 'INV1001' });
    if (inv1001) {
        console.log(`\n>>> INV1001 exists! type="${inv1001.type}", _id=${inv1001._id}`);
    }

    // 3. Show indexes on the collection
    const indexes = await db.collection('invoices').indexes();
    console.log('\n=== Indexes ===');
    indexes.forEach(idx => console.log(`  ${idx.name}: ${JSON.stringify(idx.key)} unique=${idx.unique || false}`));

    process.exit(0);
})();
