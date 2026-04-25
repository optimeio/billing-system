# Backend Status - Billing Software

This document provides an overview of the backend setup and features implemented so far.

## 🚀 Recent Updates
- **MongoDB Connection**: Successfully connected to MongoDB Atlas (Cluster0) under the database `Billingsoftware`.
- **Environment Configuration**: Set up `.env` for secure credential management.
- **Project Structure**: Organized into `controllers`, `models`, and `routes`.

## 🛠️ Implemented Features

## 🧪 Postman API Documentation

### Base URL: `http://localhost:5000`

#### 1. Authentication (`/api/auth`)
| Route | Method | Body (JSON) | Headers | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/login` | `POST` | `{"loginId": "thesmgroups@gmail.com", "password": "..."}` | None | Login using Email or Staff ID. Returns JWT token. |
| `/first-login-change`| `POST` | `{"newPassword": "newSecretPassword"}` | `Authorization: Bearer <Token>` | Use this if `isFirstLogin` is true. |
| `/forgot-password` | `POST` | `{"email": "thesmgroups@gmail.com"}` | None | Sends a 6-digit OTP to the registered email. |
| `/verify-otp` | `POST` | `{"email": "...", "otp": "..."}` | None | Validates the OTP. |
| `/reset-password` | `POST` | `{"email": "...", "otp": "...", "newPassword": "..."}` | None | Resets the password if OTP is valid. |

#### 2. Staff Management (`/api/staff`)
*All routes below require **Admin** Role and `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/create` | `POST` | `{"name": "...", "email": "...", "staffId": "S001", "password": "...", "role": "staff"}` | Creates new staff and sends welcome email. |
| `/all` | `GET` | None | Returns list of all staff (excluding admin). |
| `/:id` | `GET` | None | Returns a single staff member's details. |
| `/:id` | `PUT` | `{"name": "...", "email": "...", "role": "..."}` | Updates staff information. |
| `/:id` | `DELETE` | None | Deletes a staff member permanently. |
| `/block/:id` | `PATCH` | None | Blocks the staff member by ID. |
| `/unblock/:id` | `PATCH` | None | Unblocks the staff member by ID. |

---

#### 3. Category Management (`/api/categories`)
*Requires `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | `{"name": "Category Name", "description": "..."}` | Create a new category. |
| `/` | `GET` | None | List all categories. |
| `/:id` | `PUT` | `{"name": "..."}` | Update category details. |
| `/:id` | `DELETE` | None | Delete category (**Admin Only**). |

#### 4. Product Management (`/api/products`)
*Requires `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | `{"name": "...", "barcode": "...", "category": "ID", "price": 10, "stock": 100}` | Create a new product. |
| `/` | `GET` | None | List all products. |
| `/:id` | `GET` | None | Get product details by ID. |
| `/barcode/:barcode` | `GET` | None | Search product by barcode. |
| `/:id` | `PUT` | `{"price": 12, ...}` | Update product details. |
| `/:id` | `DELETE` | None | Delete product (**Admin Only**). |

#### 5. Billing Engine (`/api/invoices`)
*Requires `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | `{"customerName": "...", "customerPhone": "...", "items": [...]}` | Create a new invoice. Auto-creates products/categories if not found. |
| `/` | `GET` | None | List invoices (Admin: all, Staff: own). |
| `/:id` | `GET` | None | Get full invoice details. |
| `/:id/download` | `GET` | None | Download invoice PDF. |
| `/:id/cancel` | `PATCH` | None | Cancel an invoice. |

#### 6. Scanner System (`/api/scanners`)
*Requires `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/generate/:invoiceId` | `POST` | None | Generate QR code for an invoice. |
| `/` | `GET` | None | List scanners (Admin: all, Staff: own). |
| `/:id` | `GET` | None | Get scanner details. |
| `/invoice/:invoiceId` | `GET` | None | Get scanner by linked invoice ID. |
| `/:id/scan` | `PATCH`| None | Mark scanner as scanned (**Admin Only**). |

#### 7. Vendor Expenses & Purchases (`/api/expenses`)
*Requires `Authorization: Bearer <JWT_TOKEN>`*

| Route | Method | Body (JSON) | Description |
| :--- | :--- | :--- | :--- |
| `/` | `POST` | `{"title": "...", "amount": 100, "vendorName": "...", "qrImage": "data:image/png;base64,..."}` | Upload a vendor payment QR for an expense. |
| `/` | `GET` | None | List expenses (Admin: all, Staff: own). |
| `/:id/pay` | `PATCH`| None | Mark the expense/vendor QR as Paid (**Admin Only**). |

---

## 🚀 How to Test
1. **Login as Admin/Staff**: Call `POST /api/auth/login` to get your token.
2. **Set Auth**: In Postman, go to the **Auth** tab, select **Bearer Token**, and paste the token.
3. **Try Routes**: You can now manage staff, categories, products, and generate invoices.

## 📁 Final File Structure
```text
backend/
├── controllers/
│   ├── authController.js
│   ├── categoryController.js
│   ├── productController.js
│   ├── staffController.js
│   └── invoiceController.js # Module 4
├── middleware/
│   └── authMiddleware.js    # JWT & Role checking
├── models/
│   ├── User.js
│   ├── Category.js
│   ├── Product.js
│   └── Invoice.js           # Module 4
├── routes/
│   ├── authRoutes.js
│   ├── staffRoutes.js
│   ├── categoryRoutes.js
│   ├── productRoutes.js
│   └── invoiceRoutes.js     # Module 4
├── utils/
│   └── emailService.js
├── .env
├── seed.js
└── server.js                # Module 4 routes registered
```

---
**Connection Status**: ✅ Connected to `Billingsoftware`
**Port**: `5000`
