const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true }, // e.g., "Office Supplies", "Hardware"
    amount: { type: Number, required: true },
    category: { type: String },
    vendorName: { type: String }, // Who to pay
    qrImage: { type: String, required: true }, // The uploaded QR code image (Base64)
    status: { 
        type: String, 
        enum: ["pending", "paid", "rejected"], 
        default: "pending" 
    },
    description: { type: String },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Staff who uploaded
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // Admin who paid
    paidAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
