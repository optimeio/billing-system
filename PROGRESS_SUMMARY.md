# Billing Software - Progress Summary

This document outlines the current state of the Billing Software backend development as of April 24, 2026.

## 🚀 Project Overview
The project is a robust, production-ready backend for a billing and inventory management system. It features secure authentication, role-based access control, and comprehensive data models for business operations.

## 🛠️ Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB Atlas (Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens)
- **Email Service**: Nodemailer (Gmail SMTP)
- **Security**: Bcrypt.js (Password hashing), CORS enabled

## 📂 Core Project Structure
```text
backend/
├── controllers/      # Business logic for routes
├── middleware/       # JWT verification & Role checking
├── models/           # Mongoose schemas (10 models defined)
├── routes/           # API endpoint definitions
├── utils/            # Helper functions (Email service)
├── .env              # Environment variables (DB URI, Email, Secret)
├── seed.js           # Database initialization script
└── server.js         # Main entry point
```

## ✅ Implemented Features

### 1. Authentication System (`/api/auth`)
- **Login**: Support for Email or Staff ID login.
- **First-Time Login**: Forced password change mechanism for newly created staff.
- **Password Recovery**: 
  - OTP-based reset (6-digit code).
  - Email integration via `thesmgroups@gmail.com`.
- **Session Management**: JWT issued upon login with expiry.

### 2. Staff Management (`/api/staff`)
- **Role-Based Access**: Restricted to `Admin` role only.
- **Staff Creation**: Automatically hashes passwords and sends welcome emails.
- **Staff Control**: Ability to Block/Unblock users to restrict system access.
- **Monitoring**: Fetch list of all registered staff.

### 3. Database Models (Ready for Implementation)
We have defined the following schemas in `backend/models/`:
- **User**: Authentication and profile data.
- **Product**: Inventory management (Name, Price, SKU, Quantity).
- **Category**: Product categorization.
- **Invoice**: Billing records (Customer details, Items, Totals).
- **Payment**: Transaction tracking.
- **Expense**: Business expense logging.
- **StockLog**: Tracking inventory changes.
- **AuditLog**: System activity tracking for security.
- **Notification**: System alerts for staff/admin.
- **Scanner**: Barcode/QR scanning data handling.

## 🧪 API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Login via Email/ID |
| `POST` | `/api/auth/first-login-change`| User | Mandatory password update |
| `POST` | `/api/auth/forgot-password` | Public | Request 6-digit OTP |
| `POST` | `/api/auth/verify-otp` | Public | Validate received OTP |
| `POST` | `/api/auth/reset-password` | Public | Set new password with OTP |

### Staff Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/staff/create` | Admin | Register new staff + Email |
| `GET` | `/api/staff/all` | Admin | List all staff members |
| `GET` | `/api/staff/:id` | Admin | View single staff details |
| `PUT` | `/api/staff/:id` | Admin | Update staff (Name/Email/Role) |
| `DELETE` | `/api/staff/:id` | Admin | Permanently remove staff |
| `PATCH` | `/api/staff/block/:id` | Admin | Disable staff account |
| `PATCH` | `/api/staff/unblock/:id` | Admin | Enable staff account |

## 🛡️ Security Measures
- **Password Hashing**: All passwords are stored using high-entropy salted hashes (Bcrypt).
- **Route Guarding**: Private routes require a valid `Bearer Token`.
- **Role Validation**: Sensitive operations require `Admin` privileges.
- **Environment Safety**: Credentials and secrets are stored in `.env` and never hardcoded.

## 🔜 Next Steps
1.  **Product & Category APIs**: Implement CRUD operations for inventory management.
2.  **Invoicing Module**: Develop the logic for creating and generating PDF invoices.
3.  **Stock Management**: Hook up StockLogs to update Product quantities automatically.
4.  **Dashboard Analytics**: Create aggregation queries for sales and expense reports.
