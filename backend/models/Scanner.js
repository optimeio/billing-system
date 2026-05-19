const mongoose = require("mongoose");

const scannerSchema = new mongoose.Schema({
    invoiceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
        required: true
    },
    staffId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    qrCode: {
        type: String, // base64 data URL
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "scanned", "verified"],
        default: "pending"
    },
    scannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    scannedAt: {
        type: Date,
        default: null
    },
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    remarks: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model("Scanner", scannerSchema);
