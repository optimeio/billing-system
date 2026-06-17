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
        type: String, // Selfie image file path for Check-in 1
        default: null
    },
    photoOut1: {
        type: String, // Selfie image file path for Check-out 1
        default: null
    },
    checkIn2: {
        type: Date
    },
    photoIn2: {
        type: String, // Selfie image file path for Check-in 2
        default: null
    },
    checkOut2: {
        type: Date
    },
    photoOut2: {
        type: String, // Selfie image file path for Check-out 2
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
