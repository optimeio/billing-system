const nodemailer = require("nodemailer");
const logger = require("./logger");
const dns = require("dns");

// Warn if email credentials are missing, but don't crash the server
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    logger.warn("⚠️  EMAIL CONFIGURATION: EMAIL_USER or EMAIL_PASS is missing. Email sending will fail.");
}

// Fallback to standard lookup that forces family: 4
const ipv4Lookup = (hostname, options, callback) => {
    const cb = typeof options === "function" ? options : callback;
    return dns.lookup(hostname, { family: 4 }, cb);
};

// Main transporter for startup check and connection pooling (uses local DNS resolver forcing IPv4)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // uses STARTTLS
    lookup: ipv4Lookup,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateLimit: 5,
    connectionTimeout: 10000,
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

    // 1. Resolve smtp.gmail.com to IPv4 dynamically using resolve4 (strictly IPv4 A records)
    let resolvedIp = "142.250.115.109"; // Google's primary fallback Gmail SMTP IPv4 address
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4("smtp.gmail.com", (err, res) => {
                if (err || !res || res.length === 0) reject(err || new Error("No addresses found"));
                else resolve(res);
            });
        });
        resolvedIp = addresses[0];
        logger.info(`Resolved Gmail SMTP IPv4 dynamically: ${resolvedIp}`);
    } catch (dnsErr) {
        logger.warn(`dns.resolve4 failed, using fallback SMTP IP: ${resolvedIp}. Error: ${dnsErr.message}`);
    }

    // 2. Create transporter dynamically using the IPv4 IP address directly to bypass IPv6 entirely!
    const dynamicTransporter = nodemailer.createTransport({
        host: resolvedIp,
        port: 587,
        secure: false,
        tls: {
            servername: "smtp.gmail.com" // Critical: enables SNI / TLS validation for the gmail domain
        },
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : undefined
        }
    });

    try {
        const mailOptions = {
            from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
            to,
            bcc: process.env.EMAIL_USER, // Always BCC the owner/admin
            subject,
            text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
            html
        };
        const info = await dynamicTransporter.sendMail(mailOptions);
        logger.info(`📧 Email sent to ${to}: ${info.messageId}`);
        return info;
    } catch (error) {
        logger.error("❌ EMAIL SEND ERROR:", error.message);
        throw error;
    }
};

module.exports = { sendEmail, transporter };
