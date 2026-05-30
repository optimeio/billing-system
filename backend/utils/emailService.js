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

    // ─── Production HTTPS Mail Relay Bypass ───────────────────────────────────
    // Render Free tier blocks outbound SMTP ports 25, 465, and 587.
    // We bypass this restriction by making a secure HTTPS POST (port 443) to the Hostinger server.
    if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "prod") {
        logger.info(`🌐 SMTP block detected in production. Relaying email to Hostinger HTTPS Mail Relay...`);
        try {
            const relayUrl = "https://billing.thesmgroups.com/mail-relay.php";
            const secretKey = process.env.JWT_SECRET || 'BillingSoftware_Secret_Key_2026';
            
            const response = await fetch(relayUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${secretKey}`,
                    "X-Relay-Signature": secretKey // Fallback for servers that strip Authorization headers
                },
                body: JSON.stringify({
                    to,
                    subject,
                    html: html || text,
                    relay_key: secretKey, // Fallback for body-based authentication
                    smtp_user: process.env.EMAIL_USER,
                    smtp_pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : undefined
                }),
                // 10-second request timeout
                signal: AbortSignal.timeout(10000)
            });

            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
                const textResponse = await response.text();
                // If it returned HTML starting with <!doctype, it's the SPA index.html fallback (indicating a 404 on the script)
                if (textResponse.trim().startsWith("<!doctype") || textResponse.includes("<html")) {
                    throw new Error(`Hostinger returned HTML/index.html instead of executing PHP. The 'mail-relay.php' script is missing or not uploaded to the public root on billing.thesmgroups.com.`);
                }
                throw new Error(`Hostinger returned non-JSON HTML content: ${textResponse.substring(0, 100)}...`);
            }

            const data = await response.json();
            if (response.ok && data.status === "success") {
                logger.info(`✅ Email successfully delivered via Hostinger Mail Relay to: ${to}`);
                return data;
            } else {
                throw new Error(data.message || `Relay responded with status ${response.status}`);
            }
        } catch (relayErr) {
            logger.error(`❌ HTTPS Mail Relay FAILED: ${relayErr.message}`);
            logger.warn(`🔄 Falling back to standard SMTP transporter...`);
        }
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
