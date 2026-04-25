const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: "Invoice" },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    transactionId: { type: String },
    status: { type: String, enum: ["success", "failed", "refunded"], default: "success" }
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
