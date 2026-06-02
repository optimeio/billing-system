const Product = require("../models/Product");
const { getIO } = require("../utils/socketService");

// @desc    Create new product
// @route   POST /api/products
// @access  Admin/Staff
exports.createProduct = async (req, res) => {
    try {
        const { name, barcode, category, price, stock, unit, description } = req.body;

        if (barcode) {
            const productExists = await Product.findOne({ barcode });
            if (productExists) {
                return res.status(400).json({ message: "Product with this barcode already exists" });
            }
        }

        const product = await Product.create({
            name,
            barcode,
            category,
            price,
            stock,
            unit,
            description
        });

        try {
            const io = getIO();
            io.emit("productCreated", product);
        } catch (err) {
            console.error("Socket error on product create:", err);
        }

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all products
// @route   GET /api/products
// @access  Public (Protected)
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find({}).populate("category", "name");
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
exports.getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate("category", "name");
        if (!product) return res.status(404).json({ message: "Product not found" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get product by Barcode
// @route   GET /api/products/barcode/:barcode
exports.getProductByBarcode = async (req, res) => {
    try {
        const product = await Product.findOne({ barcode: req.params.barcode }).populate("category", "name");
        if (!product) return res.status(404).json({ message: "No product found with this barcode" });
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update product
// @route   PUT /api/products/:id
exports.updateProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        );

        try {
            const io = getIO();
            io.emit("productUpdated", updatedProduct);
        } catch (err) {
            console.error("Socket error on product update:", err);
        }

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        await Product.findByIdAndDelete(req.params.id);

        try {
            const io = getIO();
            io.emit("productDeleted", { id: req.params.id });
        } catch (err) {
            console.error("Socket error on product delete:", err);
        }

        res.json({ message: "Product removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
