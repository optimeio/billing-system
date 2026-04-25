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
        enum: ["pending", "scanned"],
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
    }
}, { timestamps: true });

module.exports = mongoose.model("Scanner", scannerSchema);
