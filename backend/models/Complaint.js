const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    subject: { 
        type: String, 
        required: true 
    },
    description: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "resolved"], 
        default: "pending" 
    },
    resolutionNotes: { 
        type: String, 
        default: "" 
    },
    resolvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        default: null 
    },
    resolvedAt: { 
        type: Date, 
        default: null 
    }
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);
