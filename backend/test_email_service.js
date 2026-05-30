require("dotenv").config();
const { sendEmail } = require("./utils/emailService");

console.log("Testing emailService.sendEmail with:", process.env.EMAIL_USER);

sendEmail("thesmgroups@gmail.com", "Test Email from emailService", "Hello! This is a test email sent using the backend emailService.js configuration.")
    .then(info => {
        console.log("✅ emailService send successful:", info.messageId);
        process.exit(0);
    })
    .catch(err => {
        console.error("❌ emailService send failed:", err);
        process.exit(1);
    });
