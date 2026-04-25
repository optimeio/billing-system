const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: `"SM GROUPS" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        };
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error("CRITICAL EMAIL ERROR:", error.message);
        console.error("Check if your EMAIL_USER and EMAIL_PASS are correct in .env");
    }
};

module.exports = { sendEmail };
