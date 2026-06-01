const nodemailer = require("nodemailer");
const logger = require("./logger");
const dns = require("dns");

// Warn if critical email credentials are missing, but don't crash
if (!process.env.EMAIL_USER && !process.env.RESEND_API_KEY) {
    logger.warn("⚠️  EMAIL CONFIGURATION: Neither EMAIL_USER nor RESEND_API_KEY is configured. Email sending will fail.");
}

// Custom DNS lookup that strictly forces IPv4 resolution (family: 4) and ignores any IPv6 overrides
const ipv4Lookup = (hostname, options, callback) => {
    const cb = typeof options === "function" ? options : callback;
    return dns.lookup(hostname, { family: 4 }, cb);
};

// Standard Nodemailer Transporter (for local dev and local SMTP testing)
const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Direct SSL
    lookup: ipv4Lookup, // Guarantee IPv4 only
    pool: true, // Reuse connections to make sending extremely fast
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

// Non-blocking verification on startup (only if using standard SMTP locally)
if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "prod" && process.env.EMAIL_USER) {
    transporter.verify((error) => {
        if (error) {
            logger.error("❌ EMAIL SERVICE (SMTP): Local verification failed:", error.message || error);
        } else {
            logger.info("✅ EMAIL SERVICE (SMTP): Ready to send messages locally");
        }
    });
}

/**
 * Sends email using either Resend API (HTTPS), Hostinger Mail Relay (HTTPS), or standard SMTP.
 */
const sendEmail = async (to, subject, text, html) => {
    // 1. Resend API (Recommended Production Option - Port 443 HTTPS, bypasses all SMTP blocks)
    if (process.env.RESEND_API_KEY) {
        logger.info(`📧 Routing email to Resend API (HTTPS) for recipient: ${to}`);
        try {
            const sender = process.env.RESEND_SENDER || "SM GROUPS <noreply@thesmgroups.com>";
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.RESEND_API_KEY}`
                },
                body: JSON.stringify({
                    from: sender,
                    to: [to],
                    subject: subject,
                    text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
                    html: html || text
                }),
                signal: AbortSignal.timeout(10000)
            });

            const data = await response.json();
            if (response.ok) {
                logger.info(`✅ Email successfully sent via Resend API to: ${to} (ID: ${data.id})`);
                return { messageId: data.id, status: "success", provider: "resend" };
            } else {
                throw new Error(data.message || `Resend API error status ${response.status}`);
            }
        } catch (resendErr) {
            logger.error(`❌ Resend API FAILED: ${resendErr.message}`);
            logger.warn(`🔄 Falling back to other configured methods...`);
        }
    }

    // 2. Hostinger HTTPS Mail Relay Bypass (Legacy Production Bypass)
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
                    "X-Relay-Signature": secretKey
                },
                body: JSON.stringify({
                    to,
                    subject,
                    html: html || text,
                    relay_key: secretKey,
                    smtp_user: process.env.EMAIL_USER,
                    smtp_pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : undefined
                }),
                signal: AbortSignal.timeout(10000)
            });

            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
                const textResponse = await response.text();
                if (textResponse.trim().startsWith("<!doctype") || textResponse.includes("<html")) {
                    throw new Error(`Hostinger returned HTML/index.html instead of executing PHP. The 'mail-relay.php' script is missing or not uploaded to the public root.`);
                }
                throw new Error(`Hostinger returned non-JSON HTML content: ${textResponse.substring(0, 100)}...`);
            }

            const data = await response.json();
            if (response.ok && data.status === "success") {
                logger.info(`✅ Email successfully delivered via Hostinger Mail Relay to: ${to}`);
                return { messageId: "relay-success", ...data, provider: "relay" };
            } else {
                throw new Error(data.message || `Relay responded with status ${response.status}`);
            }
        } catch (relayErr) {
            logger.error(`❌ HTTPS Mail Relay FAILED: ${relayErr.message}`);
            logger.warn(`🔄 Falling back to standard SMTP transporter...`);
        }
    }

    // 3. Fallback to standard SMTP (Local dev or environments with unblocked SMTP ports)
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error("No mail provider credentials configured. Please set RESEND_API_KEY or EMAIL_USER/EMAIL_PASS.");
    }

    try {
        const mailOptions = {
            from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
            to,
            bcc: process.env.EMAIL_USER,
            subject,
            text: text || (html ? html.replace(/<[^>]*>?/gm, "") : ""),
            html
        };
        const info = await transporter.sendMail(mailOptions);
        logger.info(`📧 Email sent via local SMTP to ${to}: ${info.messageId}`);
        return { messageId: info.messageId, status: "success", provider: "smtp" };
    } catch (error) {
        logger.error("❌ EMAIL SEND ERROR (SMTP):", error.message);
        throw error;
    }
};

module.exports = { sendEmail, transporter };
