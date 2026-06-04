const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    month: { 
        type: String, // e.g. "2026-05" (YYYY-MM format)
        required: true 
    },
    basicSalary: { 
        type: Number, 
        required: true 
    },
    allowances: {
        type: Number,
        default: 0
    },
    deductions: {
        type: Number,
        default: 0
    },
    lopDays: { 
        type: Number, 
        default: 0 
    },
    lopDeduction: { 
        type: Number, 
        default: 0 
    },
    netSalary: { 
        type: Number, 
        required: true 
    },
    status: {
        type: String,
        enum: ["paid", "pending"],
        default: "paid"
    },
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    generatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Prevent duplicate payslips for the same user in the same month
payslipSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Payslip", payslipSchema);
