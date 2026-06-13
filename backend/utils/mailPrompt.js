// mailPrompt.js – Simple CLI to send an email using Gmail with an App Password
// This script prompts the user for their Gmail address and App Password at runtime,
// then uses the existing emailService utility to send a test email.

const readline = require('readline');
const { sendEmail } = require('./emailService');

// Helper to hide password input in the console (works on Windows PowerShell/Command Prompt)
function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    // Turn off output temporarily
    const stdOutWrite = process.stdout.write;
    process.stdout.write = (msg) => {};
    rl.question(query, (answer) => {
      // Restore stdout
      process.stdout.write = stdOutWrite;
      rl.close();
      console.log(); // move to next line after hidden input
      resolve(answer);
    });
  });
}

(async () => {
  try {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const email = await new Promise((res) => {
      rl.question('Enter your Gmail address (app‑password enabled): ', (ans) => {
        res(ans.trim());
      });
    });

    const password = await promptHidden('Enter your Gmail App Password: ');
    rl.close();

    if (!email || !password) {
      console.error('❌ Both email and password are required.');
      process.exit(1);
    }

    // Temporarily inject credentials into process.env for this run only
    process.env.EMAIL_USER = email;
    process.env.EMAIL_PASS = password;

    // Send a test email back to the sender (you can change this as needed)
    const subject = '📧 Test Email from mailPrompt.js';
    const text = `Hello!\n\nThis is a test email sent using your Gmail App Password.\nTimestamp: ${new Date().toISOString()}`;

    const result = await sendEmail(email, subject, text);
    console.log('✅ Email sent successfully! Message ID:', result.messageId);
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    process.exit(1);
  }
})();
