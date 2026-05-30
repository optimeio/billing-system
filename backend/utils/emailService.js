const nodemailer = require("nodemailer");
const logger = require("./logger");
const dns = require("dns");

// Warn if email credentials are missing, but don't crash the server
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("⚠️  EMAIL CONFIGURATION: EMAIL_USER or EMAIL_PASS is missing. Email sending will fail.");
}

// Custom DNS lookup that strictly forces IPv4 resolution (family: 4) and ignores any IPv6 overrides
const ipv4Lookup = (hostname, options, callback) => {
    const cb = typeof options === "function" ? options : callback;
    return dns.lookup(hostname, { family: 4 }, cb);
};

// Transporter using Port 465 (Direct SSL) with custom IPv4 lookup.
// Direct SSL prevents STARTTLS re-resolution, ensuring the custom resolver is enforced.
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Direct SSL
    lookup: ipv4Lookup, // Guarantee IPv4 only
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
        throw error;
    }
};

module.exports = { sendEmail, transporter };
