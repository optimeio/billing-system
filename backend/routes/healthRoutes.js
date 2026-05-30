const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { transporter } = require('../utils/emailService');

router.get('/health', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1; // 1 = connected
  let mailOk = false;
  let mailError = null;
  try {
    await transporter.verify();
    mailOk = true;
  } catch (err) {
    mailError = err.message || err;
  }
  res.status(200).json({ status: 'ok', db: dbOk, mail: mailOk, mailError });
});

router.get('/test-email', async (req, res) => {
  try {
    const { sendEmail } = require('../utils/emailService');
    const info = await sendEmail(
      'thesmgroups@gmail.com',
      'Test Email from Live Render Server',
      'This is a diagnostic test email sent directly from your live Render production server to verify real-time email delivery.'
    );
    res.status(200).json({ status: 'ok', message: 'Email sent successfully', messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message || err });
  }
});

module.exports = router;

