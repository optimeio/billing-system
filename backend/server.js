require("dotenv").config();
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
const http = require("http");
const path = require("path");
const { init } = require("./utils/socketService");

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
init(server);

// Middleware - CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://billing-system-udie.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin (e.g. localhost with any port like 5174) in development
    const isLocal = origin.startsWith("http://localhost:") || origin === "http://localhost" || origin.startsWith("http://127.0.0.1:");
    
    if (isLocal || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
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

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
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

// Static file serving for uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of hanging
})
    .then(() => console.log("✅ MongoDB Connected: Billingsoftware"))
    .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Test Route
app.get("/", (req, res) => {
    res.send("Billing Software API is running...");
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        message: "Endpoint not found. Please check your URL and method (POST/GET).",
        path: req.url
    });
});

const maxPortAttempts = 10;
let currentPort = parseInt(process.env.PORT || 5002, 10);
let attempts = 0;

function startServer(port) {
    server.listen(port);
}

server.on("error", (error) => {
    if (error.syscall !== "listen") {
        throw error;
    }
    if (error.code === "EADDRINUSE") {
        console.warn(`⚠️ Port ${currentPort} is already in use.`);
        attempts++;
        if (attempts < maxPortAttempts) {
            currentPort++;
            console.log(`🔄 Retrying on the next available port: ${currentPort}...`);
            startServer(currentPort);
        } else {
            console.error(`❌ Failed to start server: All ports from ${process.env.PORT || 5002} to ${currentPort} are occupied.`);
            process.exit(1);
        }
    } else {
        throw error;
    }
});

server.on("listening", () => {
    console.log(`🚀 Server successfully running on port ${currentPort}`);
    if (currentPort !== parseInt(process.env.PORT || 5002, 10)) {
        console.warn(`⚠️ Warning: Backend is running on port ${currentPort} instead of the default ${process.env.PORT || 5002}.`);
        console.warn(`Please ensure your frontend .env is updated: VITE_API_URL=http://localhost:${currentPort}/api`);
    }
});

startServer(currentPort);
