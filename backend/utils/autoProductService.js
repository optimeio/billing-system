const Product = require("../models/Product");
const Category = require("../models/Category");

const generateBarcode = () => {
    return `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const findOrCreateCategory = async (categoryName) => {
    if (!categoryName) return { category: null, isNew: false };

    // Case-insensitive exact match
    let category = await Category.findOne({ name: { $regex: new RegExp(`^${categoryName}$`, "i") } });
    
    if (!category) {
        category = await Category.create({
            name: categoryName,
            description: "Auto created from billing"
        });
        return { category, isNew: true };
    }
    
    return { category, isNew: false };
};

const findOrCreateProduct = async (productName, categoryId, price, createdBy) => {
    if (!productName) return { product: null, isNew: false };

    // Case-insensitive exact match
    let product = await Product.findOne({ name: { $regex: new RegExp(`^${productName}$`, "i") } });

    if (!product) {
        product = await Product.create({
            name: productName,
            barcode: generateBarcode(),
            category: categoryId,
            price: price || 0,
            stock: 0,
            createdBy: createdBy,
            isAutoCreated: true
        });
        return { product, isNew: true };
    }

    return { product, isNew: false };
};

module.exports = {
    generateBarcode,
    findOrCreateCategory,
    findOrCreateProduct
};
