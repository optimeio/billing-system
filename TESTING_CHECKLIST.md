# 🧪 SM Groups - Master Testing Checklist

Use this checklist to perform a 100% "Nook & Corner" audit of the system. Ensure you test with different roles (**Admin**, **Inventory**, and **Staff**).

---

## 🔐 1. Authentication & Security
- [ ] **Login**: Test with Email AND Staff ID.
- [ ] **Security OTP**: Verify that first-time login triggers an email with a 6-digit code.
- [ ] **Password Change**: Verify that setting a permanent password redirects to the dashboard.
- [ ] **Blocking**: Login as Admin -> Block a Staff -> Verify they cannot login anymore.
- [ ] **Session Protection**: Verify that logging out clears all local session data.

## 📊 2. Admin Dashboard
- [ ] **Real-time Stats**: Create an invoice as Staff -> Verify Revenue card updates immediately for Admin.
- [ ] **Low Stock Alerts**: Edit a product to have `5` units -> Verify it turns **Red** in the "Stock Alerts" list.
- [ ] **Staff Presence**: Verify the "Recent Staff Activity" updates when someone logs in.

## 👥 3. Staff Management
- [ ] **Custom Roles**: Verify you can TYPE a custom role (e.g., "Supervisor") in the role field.
- [ ] **Edit Staff**: Update a staff phone number -> Verify it persists in their profile.
- [ ] **Staff ID Verification**: Verify every staff member has a unique ID (e.g., SMG-001).

## 📦 4. Inventory System
- [ ] **Categories**: Create a category -> Verify it appears in the product dropdown.
- [ ] **Product Addition**: Add a product with a barcode -> Verify it appears in the list.
- [ ] **Stock Validation**: Try to bill a product that has `0` stock -> Verify the system prevents it.
- [ ] **Edit Stock**: Manually update stock -> Verify the update reflects globally.

## 🧾 5. Billing & Invoicing
- [ ] **Customer Data**: Fill name/phone -> Verify they appear on the generated invoice.
- [ ] **Line Items**: Add 3 different items -> Verify calculations (Price x Qty) are 100% accurate.
- [ ] **PDF Download**: Click "Download" -> Verify the PDF is legible and professional.
- [ ] **Invoice Search**: Search for an invoice by ID or Customer Name.

## 💰 6. Expense & Payments
- [ ] **Expense Submission**: Submit an expense as Staff -> Verify it appears as "Pending" for Admin.
- [ ] **Approval Flow**: Admin approves expense -> Verify Staff sees "Approved" badge.
- [ ] **Manual Payments**: Verify that offline payments appear in the Admin "Payment Queue".

## 📅 7. HR & Attendance (Scanner)
- [ ] **Leave Request**: Submit a 3-day leave -> Verify dates and reason appear correctly.
- [ ] **Email Notification**: Approve leave as Admin -> Check the Staff's email for the approval notice.
- [ ] **Leave History**: Verify that each staff member sees ONLY their own history.
- [ ] **Scanner QR**: Generate a QR code as Staff -> Verify the UI is clear and high-resolution.

## 📢 8. Announcements & Messaging
- [ ] **Global Notice**: Send announcement to "Everyone" -> Verify it shows "Global" badge for all users.
- [ ] **Targeted Notice**: Send to 1 specific person -> Verify others **cannot** see it.
- [ ] **Threaded Replies**: Reply to an announcement -> Verify the thread maintains order (WhatsApp style).
- [ ] **Private Indicator**: Verify "Only you and Admin can see this" note appears on targeted messages.

## 📱 9. Mobile & Responsiveness
- [ ] **Hamburger Menu**: Check that the sidebar hides on mobile and opens via the menu button.
- [ ] **Mobile Billing**: Try adding items on a small screen (iPhone/Android view).
- [ ] **Table Scrolling**: Ensure large tables can be scrolled horizontally on mobile.

## 🌐 10. SEO & Accessibility
- [ ] **Aria Labels**: Use a screen reader or inspector to verify buttons have `aria-label`.
- [ ] **Meta Description**: View page source -> Verify `<meta name="description">` exists.
- [ ] **Title Tags**: Verify the browser tab says "SM Groups | [Page Name]".

---
**Audit Completion Date:** ___________________
**Auditor Name:** ___________________
**Notes:** ____________________________________________________
