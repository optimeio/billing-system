const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    type: { type: String, default: "product" }
}, { timestamps: true });

module.exports = mongoose.model("Category", categorySchema);
