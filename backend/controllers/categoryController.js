const Category = require("../models/Category");
const { getIO } = require("../utils/socketService");

// @desc    Create new category
// @route   POST /api/categories
// @access  Admin/Staff
exports.createCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        const categoryExists = await Category.findOne({ name });
        if (categoryExists) {
            return res.status(400).json({ message: "Category already exists" });
        }

        const category = await Category.create({ name, description });

        try {
            const io = getIO();
            io.emit("categoryCreated", category);
        } catch (err) {
            console.error("Socket error on category create:", err);
        }

        res.status(201).json(category);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public (or Protected)
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.find({});
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Admin/Staff
exports.updateCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        category.name = name || category.name;
        category.description = description || category.description;

        const updatedCategory = await category.save();

        try {
            const io = getIO();
            io.emit("categoryUpdated", updatedCategory);
        } catch (err) {
            console.error("Socket error on category update:", err);
        }

        res.json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Admin Only
exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        await Category.findByIdAndDelete(req.params.id);

        try {
            const io = getIO();
            io.emit("categoryDeleted", { id: req.params.id });
        } catch (err) {
            console.error("Socket error on category delete:", err);
        }

        res.json({ message: "Category removed successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
