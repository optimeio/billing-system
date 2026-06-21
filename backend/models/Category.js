const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, default: "product" },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
