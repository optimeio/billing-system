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

module.exports = router;

