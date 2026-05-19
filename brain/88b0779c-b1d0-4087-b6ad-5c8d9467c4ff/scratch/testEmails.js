require("dotenv").config({ path: "../../../backend/.env" });
const { sendEmail } = require("../../../backend/utils/emailService");

async function runTests() {
    console.log("🚀 Starting Email Parsing Tests...");
    
    const testEmail = process.env.EMAIL_USER; // Send to self for testing
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // 1. Welcome Email Test
    console.log("\n1. Testing Welcome Email...");
    const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #dc2626;">Welcome to SM GROUPS</h2>
            <p>Hello <b>Test User</b>,</p>
            <p>Your account has been successfully created. You can now access the Billing Software with the following credentials:</p>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
                <p><b>Staff ID:</b> STAFF001</p>
                <p><b>Temporary Password:</b> TempPass123!</p>
            </div>
            <p style="color: #dc2626;"><b>Note:</b> You will be required to change your password immediately after your first login for security purposes.</p>
            <a href="${frontendUrl}/login" style="display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold;">Login to Portal</a>
            <p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">If you did not expect this email, please contact the administrator.</p>
        </div>
    `;
    await sendEmail(testEmail, "TEST: Welcome Email Parsing", "", welcomeHtml);

    // 2. OTP Email Test
    console.log("\n2. Testing OTP Email...");
    const otpHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #ddd; padding: 20px;">
            <h2 style="color: #dc2626;">Security Verification</h2>
            <p>Your account security code is:</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #dc2626;">
                123456
            </div>
            <p>Use this to set your permanent password or verify your login. This code will expire in 10 minutes.</p>
        </div>
    `;
    await sendEmail(testEmail, "TEST: OTP Email Parsing", "Your security code is 123456", otpHtml);

    // 3. Leave Status Email Test (Approved)
    console.log("\n3. Testing Leave Status Email...");
    const leaveHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
            <h2 style="color: #27ae60;">Leave Approved</h2>
            <p>Hello <b>Test User</b>,</p>
            <p>Your leave application for <b>Medical Leave</b> from <b>10/05/2026</b> to <b>12/05/2026</b> has been <b>approved</b>.</p>
            <p><b>Admin Comment:</b> Get well soon!</p>
            <p style="margin-top: 20px; font-size: 0.8em; color: #7f8c8d;">This is an automated notification from SM GROUPS Billing System.</p>
        </div>
    `;
    await sendEmail(testEmail, "TEST: Leave Status Email Parsing", "", leaveHtml);

    console.log("\n✅ All test emails sent. Check the terminal for success logs.");
}

runTests().catch(err => {
    console.error("❌ Test Script Failed:", err.message);
});
