const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    leaveType: { 
        type: String, 
        enum: ["Sick Leave", "Casual Leave", "Paternity Leave", "Maternity Leave", "Unpaid Leave", "Other"],
        required: true 
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date, 
        required: true 
    },
    reason: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ["pending", "approved", "rejected"], 
        default: "pending" 
    },
    adminComment: { 
        type: String 
    },
    appliedAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });

module.exports = mongoose.model("Leave", leaveSchema);
