const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema({
    senderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    title: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    isGlobal: { 
        type: Boolean, 
        default: true 
    },
    recipients: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" 
    }],
    replies: [{
        senderId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "User" 
        },
        message: { 
            type: String, 
            required: true 
        },
        replyToAll: { 
            type: Boolean, 
            default: false 
        },
        createdAt: { 
            type: Date, 
            default: Date.now 
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model("Announcement", announcementSchema);
