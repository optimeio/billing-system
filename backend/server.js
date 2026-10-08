require("dotenv").config();
const dns = require("dns");
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Validate critical env vars on startup
const requiredEnv = ["MONGODB_URI", "JWT_SECRET", "EMAIL_USER", "EMAIL_PASS", "FRONTEND_URL"];
requiredEnv.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ ENV MISSING: ${key} is not set in .env. Please add it.`);
    process.exit(1);
  }
});

const authRoutes = require("./routes/authRoutes");
const staffRoutes = require("./routes/staffRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const scannerRoutes = require("./routes/scannerRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const adminScannerRoutes = require("./routes/adminScannerRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const profileRoutes = require("./routes/profileRoutes");
const leaveRoutes = require("./routes/leaveRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const healthRoutes = require("./routes/healthRoutes");
const payslipRoutes = require("./routes/payslipRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const complaintRoutes = require("./routes/complaintRoutes");
const companyRoutes = require("./routes/companyRoutes");
const http = require("http");
const path = require("path");
const { init } = require("./utils/socketService");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
init(server);

// Middleware - CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://billing.thesmgroups.com',
  'https://billing-system-wgas.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://187.77.184.25',
  'https://187.77.184.25',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // Allow any localhost origin in development or VPS IP
    const isLocal = origin.startsWith("http://localhost:") || origin === "http://localhost" || origin.startsWith("http://127.0.0.1:");
    const isVpsIp = origin.includes("187.77.184.25");

    if (isLocal || isVpsIp || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Smart Content-Type Fixer
app.use((req, res, next) => {
    if (req.headers["content-type"] === "text/plain") {
        req.headers["content-type"] = "application/json";
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger (reduced in production)
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production' || req.url.startsWith('/api')) {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    }
    next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/scanners", scannerRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/admin/scanners", adminScannerRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/payslips", payslipRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/companies", companyRoutes);

// Static file serving for uploads with explicit CORS headers for client-side HTML canvas rendering
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res) => {
        res.set("Access-Control-Allow-Origin", "*");
    }
}));

// Uploads 404 handler to prevent falling through to index.html
app.use("/uploads", (req, res) => {
    res.status(404).json({ message: "Uploaded file not found", path: req.url });
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env — cannot start database connection.');
  process.exit(1);
}

const connectionOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
};

let isConnecting = false;

async function connectDB() {
  // Prevent concurrent connection attempts
  if (isConnecting) return;
  const state = mongoose.connection.readyState;
  // 1 = connected, 2 = connecting
  if (state === 1 || state === 2) return;

  isConnecting = true;
  try {
    await mongoose.connect(MONGODB_URI, connectionOptions);
    console.log('✅ MongoDB Connected: Billingsoftware');

    // Auto-seed default companies if empty
    try {
      const Company = require("./models/Company");
      const defaultCompanies = require("./utils/defaultCompanies");
      const count = await Company.countDocuments();
      if (count === 0) {
        console.log('🌱 Seeding default companies into database...');
        await Company.insertMany(defaultCompanies);
      }
    } catch (seedErr) {
      console.error('Seeding companies notice:', seedErr.message);
    }
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // Retry after 5 seconds
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 5000);
    return;
  }
  isConnecting = false;
}

// Initial connection
connectDB();

// Auto-reconnect on disconnect (guarded to prevent loops)
mongoose.connection.on('disconnected', () => {
  if (!isConnecting) {
    console.warn('⚠️ MongoDB disconnected. Attempting to reconnect in 5s...');
    setTimeout(() => {
      isConnecting = false;
      connectDB();
    }, 5000);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err.message);
});

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
    // Serve any static files
    app.use(express.static(path.join(__dirname, "../frontend/dist")));

    // Handle React routing, return all GET requests to React app
    app.use((req, res, next) => {
        if (req.method !== 'GET') return next();
        if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) return next();
        const indexPath = path.join(__dirname, "../frontend/dist", "index.html");
        const fs = require('fs');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({ message: "Page not found", path: req.url });
        }
    });
} else {
    // Test Route
    app.get("/", (req, res) => {
        res.json({
          status: "ok",
          message: "Billing Software API is running...",
          environment: process.env.NODE_ENV || "development",
          timestamp: new Date().toISOString()
        });
    });
}

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        message: "Endpoint not found. Please check your URL and method (POST/GET).",
        path: req.url
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.message || err);
    const statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
    res.status(statusCode).json({
        message: err.message || "An unexpected server error occurred",
        success: false
    });
});

// Start Server
const port = parseInt(process.env.PORT || 5002, 10);

server.listen(port, () => {
  console.log(`🚀 Server successfully running on port ${port}`);
  console.log(`📡 CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle startup errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please free the port and restart.`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});
