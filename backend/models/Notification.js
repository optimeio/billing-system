const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false }, // null means global/admin notification
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["invoiceCreated", "paymentApproved", "lowStock", "expensePaid", "staffBlocked", "staffUnblocked", "general"], default: "general" },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
