const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { verifyTransport } = require('../utils/emailService');

router.get('/health', async (req, res) => {
  const dbOk = mongoose.connection.readyState === 1; // 1 = connected
  let mailOk = false;
  try {
    await verifyTransport();
    mailOk = true;
  } catch (_) {}
  res.status(200).json({ status: 'ok', db: dbOk, mail: mailOk });
});

module.exports = router;
