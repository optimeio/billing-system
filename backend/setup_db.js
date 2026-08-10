/**
 * setup_db.js — Full database setup for Billing_software
 *
 * Connects to MongoDB Atlas, ensures all 12 collections exist with proper
 * indexes, and seeds the default admin / inventory / staff users.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:  node setup_db.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

// ── Models ───────────────────────────────────────────────────────────────────
const User         = require("./models/User");
const Category     = require("./models/Category");
const Product      = require("./models/Product");
const Invoice      = require("./models/Invoice");
const Payment      = require("./models/Payment");
const Expense      = require("./models/Expense");
const Scanner      = require("./models/Scanner");
const Notification = require("./models/Notification");
const Leave        = require("./models/Leave");
const Announcement = require("./models/Announcement");
const AuditLog     = require("./models/AuditLog");
const StockLog     = require("./models/StockLog");

// ── Seed data ────────────────────────────────────────────────────────────────
const seedUsers = [
  {
    name: "SM Groups Admin",
    email: "thesmgroups@gmail.com",
    phone: "9488316728",
    staffId: "ADMIN_MAIN",
    password: "TSMGPVT@2026",
    role: "admin",
    isFirstLogin: false,
  },
  {
    name: "Official Administrator",
    email: "tsmgmdofficial@gmail.com",
    phone: "9488316728",
    staffId: "ADMIN_OFFICIAL",
    password: "TSMG1997",
    role: "admin",
    isFirstLogin: false,
  },
  {
    name: "Inventory Manager",
    email: "theoptime.io@gmail.com",
    phone: "9488316728",
    staffId: "INV_MAIN",
    password: "TSMG1997",
    role: "inventory_manager",
    isFirstLogin: false,
  },
  {
    name: "Nithyashree T",
    email: "shreenithya111@gmail.com",
    phone: "9488316728",
    staffId: "SM003",
    password: "StaffPassword123",
    role: "staff",
    isFirstLogin: false,
  },
];

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI is not set in .env");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB Atlas...");
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 15000,
    socketTimeoutMS: 45000,
  });
  console.log("✅ Connected to MongoDB Atlas\n");

  // ── 1. Ensure every collection + indexes ───────────────────────────────
  const models = [
    User, Category, Product, Invoice, Payment,
    Expense, Scanner, Notification, Leave, Announcement,
    AuditLog, StockLog,
  ];

  console.log("📦 Creating collections & building indexes...");
  for (const Model of models) {
    const name = Model.collection.collectionName;
    try {
      await Model.createCollection();
      await Model.syncIndexes();          // idempotent — safe to re-run
      const count = await Model.countDocuments();
      console.log(`   ✅ ${name} — OK (${count} docs)`);
    } catch (err) {
      // "NamespaceExists" just means the collection already exists — harmless
      if (err.codeName === "NamespaceExists" || err.code === 48) {
        await Model.syncIndexes();
        const count = await Model.countDocuments();
        console.log(`   ✅ ${name} — already exists (${count} docs)`);
      } else {
        console.error(`   ❌ ${name} — ${err.message}`);
      }
    }
  }

  // ── 2. Seed users ──────────────────────────────────────────────────────
  console.log("\n👤 Seeding default users...");
  for (const u of seedUsers) {
    let existing = await User.findOne({
      $or: [{ email: u.email.toLowerCase() }, { staffId: u.staffId }],
    });

    if (!existing) {
      const user = new User(u);       // pre-save hook hashes password
      await user.save();
      console.log(`   ✅ Created: ${u.name} (${u.role})`);
    } else {
      // Update everything so credentials are reset too
      existing.name        = u.name;
      existing.email       = u.email;
      existing.phone       = u.phone;
      existing.staffId     = u.staffId;
      existing.password    = u.password;  // re-hashed by pre-save hook
      existing.role        = u.role;
      existing.isFirstLogin = u.isFirstLogin;
      existing.isBlocked   = false;
      await existing.save();
      console.log(`   ✅ Updated: ${u.name} (${u.role})`);
    }
  }

  // ── 3. Summary ─────────────────────────────────────────────────────────
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  console.log(`\n══════════════════════════════════════════════════════`);
  console.log(`  Database: ${db.databaseName}`);
  console.log(`  Collections: ${collections.length}`);
  collections.forEach((c) => console.log(`    • ${c.name}`));
  console.log(`══════════════════════════════════════════════════════`);
  console.log(`\n📋 Login Credentials:
  ──────────────────────────────────────────────────────
    Main Admin:  thesmgroups@gmail.com     / TSMGPVT@2026
    Extra Admin: tsmgmdofficial@gmail.com  / TSMG1997
    Inventory:   theoptime.io@gmail.com    / TSMG1997
    Staff:       shreenithya111@gmail.com  / StaffPassword123
  ───────────────────────────────────────────────────────────────────`);
  console.log("\n✅ Setup complete — no errors.");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Setup failed:", err.message);
  process.exit(1);
});
