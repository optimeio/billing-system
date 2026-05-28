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

transporter.sendMail({
    from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
    to: "thesmgroups@gmail.com", // send to themselves to test
    subject: "Test Email from Backend",
    text: "This is a test email to verify nodemailer is working."
}).then(info => {
    console.log("✅ Email sent successfully:", info.messageId);
    process.exit(0);
}).catch(err => {
    console.error("❌ Failed to send email:", err);
    process.exit(1);
});
