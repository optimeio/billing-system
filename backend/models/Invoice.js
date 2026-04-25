const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: { 
        type: String, 
        required: true, 
        unique: true 
    },
    customerName: { 
        type: String, 
        required: true 
    },
    customerPhone: { 
        type: String, 
        required: true 
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
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentStatus: { 
        type: String, 
        enum: ["pending", "paid", "cancelled"], 
        default: "pending" 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    }
}, { timestamps: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
