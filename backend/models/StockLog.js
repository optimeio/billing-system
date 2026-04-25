const mongoose = require("mongoose");

const stockLogSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    change: { type: Number, required: true }, // positive for addition, negative for deduction
    reason: { type: String }, // e.g., "Sale", "Manual Adjustment", "Restock"
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

module.exports = mongoose.model("StockLog", stockLogSchema);
