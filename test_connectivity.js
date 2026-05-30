/**
 * Production Connectivity Test
 * Tests: MongoDB Atlas, Gmail SMTP, and env var validation
 * Run: node test_connectivity.js
 */
require('dotenv').config({ path: './backend/.env' });

const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const PASS = '✅';
const FAIL = '❌';
const WARN = '⚠️';

async function testAll() {
  console.log('═══════════════════════════════════════════════');
  console.log('  PRODUCTION CONNECTIVITY TEST');
  console.log('═══════════════════════════════════════════════\n');

  // 1. Check env vars
  console.log('── ENV VARIABLES ──────────────────────────────');
  const envVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'EMAIL_USER', 'EMAIL_PASS', 'FRONTEND_URL'];
  let envOk = true;
  for (const key of envVars) {
    if (process.env[key]) {
      const val = key.includes('SECRET') || key.includes('PASS') || key === 'MONGODB_URI'
        ? process.env[key].substring(0, 15) + '...'
        : process.env[key];
      console.log(`  ${PASS} ${key} = ${val}`);
    } else {
      console.log(`  ${FAIL} ${key} = NOT SET`);
      envOk = false;
    }
  }
  console.log(`  Result: ${envOk ? PASS + ' All env vars present' : FAIL + ' Missing env vars!'}\n`);

  // 2. Test MongoDB
  console.log('── MONGODB ATLAS ──────────────────────────────');
  try {
    const uri = process.env.MONGODB_URI;
    console.log(`  Connecting to: ${uri.split('@')[1].split('/')[0]}...`);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 20000,
    });
    
    console.log(`  ${PASS} Connected successfully!`);
    console.log(`  ${PASS} Database: ${mongoose.connection.db.databaseName}`);
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`  ${PASS} Collections found: ${collections.length}`);
    collections.forEach(c => console.log(`      → ${c.name}`));
    
    // Quick count on key collections
    for (const colName of ['users', 'products', 'invoices', 'categories']) {
      const col = collections.find(c => c.name === colName);
      if (col) {
        const count = await mongoose.connection.db.collection(colName).countDocuments();
        console.log(`  ${PASS} ${colName}: ${count} documents`);
      }
    }
    
    await mongoose.disconnect();
    console.log(`  ${PASS} Disconnected cleanly\n`);
  } catch (err) {
    console.log(`  ${FAIL} MongoDB connection FAILED: ${err.message}`);
    if (err.message.includes('ENOTFOUND')) {
      console.log(`  ${WARN} DNS resolution failed — check cluster hostname`);
    } else if (err.message.includes('authentication')) {
      console.log(`  ${WARN} Authentication failed — check username/password in URI`);
    } else if (err.message.includes('IP')) {
      console.log(`  ${WARN} IP not whitelisted — add 0.0.0.0/0 in Atlas Network Access`);
    }
    console.log('');
  }

  // 3. Test Gmail SMTP
  console.log('── GMAIL SMTP ─────────────────────────────────');
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : undefined,
      },
    });
    
    await transporter.verify();
    console.log(`  ${PASS} SMTP connection verified`);
    console.log(`  ${PASS} Authenticated as: ${process.env.EMAIL_USER}`);
    console.log(`  ${PASS} Ready to send emails\n`);
  } catch (err) {
    console.log(`  ${FAIL} SMTP verification FAILED: ${err.message}`);
    if (err.message.includes('Invalid login')) {
      console.log(`  ${WARN} Check that EMAIL_PASS is a valid Gmail App Password`);
      console.log(`  ${WARN} Generate one at: https://myaccount.google.com/apppasswords`);
    }
    console.log('');
  }

  // 4. CORS / Frontend URL check
  console.log('── CORS / FRONTEND ────────────────────────────');
  const frontendUrl = process.env.FRONTEND_URL;
  console.log(`  ${PASS} FRONTEND_URL: ${frontendUrl}`);
  if (frontendUrl.startsWith('https://')) {
    console.log(`  ${PASS} Using HTTPS (secure)`);
  } else {
    console.log(`  ${WARN} Not using HTTPS — should be https:// in production`);
  }
  console.log('');

  // Summary
  console.log('═══════════════════════════════════════════════');
  console.log('  TEST COMPLETE — Review results above');
  console.log('═══════════════════════════════════════════════');
  
  process.exit(0);
}

testAll().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
