const nodemailer = require("nodemailer");
const logger = require("./logger");

// Configure the transporter for Gmail
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // SSL/TLS
    connectionTimeout: 10000, // 10s
    socketTimeout: 15000, // 15s
    auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : undefined
    }
});


// Verify connection on startup
transporter.verify((error, success) => {
    if (error) {
        // Don’t crash the server if email creds are missing.
        logger.error("❌ EMAIL SERVICE ERROR:", error && error.message ? error.message : error);
    } else {
        logger.info("✅ EMAIL SERVICE: Ready to send messages");
    }
});


const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
            to,
            bcc: process.env.EMAIL_USER, // Always BCC the owner/admin
            subject,
            text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""), // Fallback text from HTML if text is empty
            html
        };
        const info = await transporter.sendMail(mailOptions);
        logger.info(`📧 Email sent to ${to} (BCC: ${process.env.EMAIL_USER}): ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error("❌ CRITICAL EMAIL ERROR:", error.message);
        logger.error("Details: Check if your EMAIL_USER and EMAIL_PASS (App Password) are correct.");
        throw error;
    }
};

module.exports = { sendEmail, transporter };
