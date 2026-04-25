const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
    action: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    details: { type: Object },
    ipAddress: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
