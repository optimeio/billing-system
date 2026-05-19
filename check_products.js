require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Product = require('./backend/models/Product');

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const count = await Product.countDocuments();
        console.log(`Total products: ${count}`);
        const products = await Product.find().limit(5);
        console.log('Recent products:', JSON.stringify(products, null, 2));
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkProducts();
