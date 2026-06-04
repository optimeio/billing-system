const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    vendorName: { type: String },
    category: { type: String },
    paymentMethod: { type: String },
    billFile: { type: String }, // Path to the uploaded bill file
    scannerFile: { type: String }, // Path to the uploaded scanner/screenshot file
    status: { 
        type: String, 
        enum: ["pending", "approved", "rejected"], 
        default: "pending" 
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);

