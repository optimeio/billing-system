const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    date: { 
        type: String, // format YYYY-MM-DD representing local calendar day
        required: true 
    },
    status: { 
        type: String, 
        enum: ["present", "absent", "leave"], 
        default: "absent" 
    },
    checkIn: { 
        type: Date 
    },
    checkOut: { 
        type: Date 
    },
    workHours: { 
        type: Number 
    },
    photo: { 
        type: String, // Selfie image file path (e.g. /uploads/xxx.jpg)
        default: null
    },
    notes: { 
        type: String,
        default: ""
    }
}, { timestamps: true });

// Prevent duplicate entries for a user on a specific calendar day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
