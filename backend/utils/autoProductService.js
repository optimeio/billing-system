const Product = require("../models/Product");
const Category = require("../models/Category");

const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const generateBarcode = () => {
    return `PRD${Date.now()}${Math.floor(Math.random() * 1000)}`;
};

const findOrCreateCategory = async (categoryName) => {
    if (!categoryName || !categoryName.trim()) return { category: null, isNew: false };

    const trimmed = categoryName.trim();
    // Case-insensitive exact match with escaped regex
    let category = await Category.findOne({ name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } });
    
    if (!category) {
        category = await Category.create({
            name: trimmed,
            description: "Auto created from billing"
        });
        return { category, isNew: true };
    }
    
    return { category, isNew: false };
};

const findOrCreateProduct = async (productName, categoryId, price, createdBy) => {
    if (!productName || !productName.trim()) return { product: null, isNew: false };

    const trimmed = productName.trim();
    // Case-insensitive exact match with escaped regex
    let product = await Product.findOne({ name: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, "i") } });

    if (!product) {
        product = await Product.create({
            name: trimmed,
            barcode: generateBarcode(),
            category: categoryId,
            price: Number(price) || 0,
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

