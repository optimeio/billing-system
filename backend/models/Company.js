const mongoose = require("mongoose");

const companySchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true,
        unique: true
    },
    logo: { 
        type: String, 
        default: "" 
    },
    address: { 
        type: String, 
        default: "" 
    },
    gst: { 
        type: String, 
        default: "" 
    },
    phone: { 
        type: String, 
        default: "" 
    },
    email: { 
        type: String, 
        default: "" 
    },
    bankDetails: {
        accountName: { type: String, default: "" },
        bankName: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" },
        branchName: { type: String, default: "" }
    },
    signature: { 
        type: String, 
        default: "" 
    },
    themeColor: { 
        type: String, 
        default: "#d60000" 
    }
}, { timestamps: true });

module.exports = mongoose.model("Company", companySchema);
