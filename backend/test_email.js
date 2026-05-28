require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("Testing email with user:", process.env.EMAIL_USER);

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s+/g, '') // remove spaces just in case
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error("❌ EMAIL SERVICE ERROR:", error);
    } else {
        console.log("✅ EMAIL SERVICE: Ready to send messages");
    }
    process.exit(0);
});
