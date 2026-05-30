const nodemailer = require("nodemailer");
const logger = require("./logger");

// Warn if email credentials are missing, but don't crash the server
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("⚠️  EMAIL CONFIGURATION: EMAIL_USER or EMAIL_PASS is missing. Email sending will fail.");
}

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    pool: true, // Reuse connections to make sending extremely fast
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 5,
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : undefined
    }
});

// Verify connection on startup (non-blocking)
transporter.verify((error) => {
    if (error) {
        logger.error("❌ EMAIL SERVICE ERROR:", error && error.message ? error.message : error);
        logger.error("   → Check EMAIL_USER and EMAIL_PASS (Gmail App Password) in .env");
        logger.error("   → Make sure 2-Step Verification is enabled and App Password is generated at myaccount.google.com");
    } else {
        logger.info("✅ EMAIL SERVICE: Ready to send messages");
    }
});

const sendEmail = async (to, subject, text, html) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("Email credentials not configured. Set EMAIL_USER and EMAIL_PASS in .env");
    }

    try {
        const mailOptions = {
            from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
            to,
            bcc: process.env.EMAIL_USER, // Always BCC the owner/admin
            subject,
            text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
            html
        };
        const info = await transporter.sendMail(mailOptions);
        logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error("❌ EMAIL SEND ERROR:", error.message);
        logger.error("   → Verify EMAIL_USER and EMAIL_PASS are correct in backend/.env");
        throw error;
    }
};

module.exports = { sendEmail, transporter };
