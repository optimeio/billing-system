const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    barcode: { type: String, unique: true, sparse: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category" },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    unit: { type: String, default: "pcs" },
    description: { type: String },
    image: { type: String },
    isAutoCreated: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
