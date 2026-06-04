const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: true
    },
    staffId: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        // Accepted roles: admin, staff, inventory
        // Any other value will be treated as "staff" in the application layer
        default: "staff"
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isFirstLogin: {
        type: Boolean,
        default: true
    },
    otp: {
        type: String,
        default: null
    },
    otpExpiry: {
        type: Date,
        default: null
    },
    address: {
        type: String,
        default: ""
    },
    profilePic: {
        type: String,
        default: ""
    },
    basicSalary: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// ─── Pre-save Hook: Hash password + lowercase email ──────────────────────────
// Using async function without next() — compatible with Mongoose 7+
userSchema.pre("save", async function() {
    // Ensure email is stored in lowercase
    if (this.isModified("email")) {
        this.email = this.email.toLowerCase();
    }
    // Only hash password if it was modified
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// ─── Instance Method: Compare password ───────────────────────────────────────
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);