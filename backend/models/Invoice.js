const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    customerName: { 
        type: String, 
        default: "" 
    },
    customerPhone: { 
        type: String, 
        default: "" 
    },
    customerAddress: {
        type: String,
        default: ""
    },
    customerIdNumber: {
        type: String,
        default: ""
    },
    items: [{
        productId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Product" 
        },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        qty: { type: Number, required: true },
        total: { type: Number, required: true }
    }],
    subtotal: { type: Number, required: true },
    taxableValue: { type: Number, default: 0 },
    hsnCode: { type: String, default: "99" },
    taxRate: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: { 
        type: String, 
        enum: ["pending", "paid", "cancelled", "approved", "rejected"], 
        default: "pending" 
    },
    type: {
        type: String,
        enum: ["invoice", "quotation"],
        default: "invoice"
    },
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company"
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    qtyLabel: {
        type: String,
        default: "Qty"
    },
    approvalPhoto: {
        type: String,
        default: ""
    },
    invoiceDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
