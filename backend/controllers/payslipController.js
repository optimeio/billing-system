const User = require("../models/User");
const Leave = require("../models/Leave");
const Payslip = require("../models/Payslip");
const Notification = require("../models/Notification");
const { sendEmail } = require("../utils/emailService");
const { getIO } = require("../utils/socketService");
const { generatePayslipPDF } = require("../utils/payslipPdfGenerator");

// Helper to send payslip email with PDF attachment
const sendPayslipEmailToStaff = async (payslip, employee) => {
    const [yearStr, monthStr] = payslip.month.split("-");
    const year = yearStr;
    const monthNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[parseInt(monthStr, 10) - 1] || payslip.month;

    const emailHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
            <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Monthly Payslip & LOP Statement</p>
          </div>
          <div style="padding: 24px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${employee.name}</strong>,</p>
            <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your payslip for the month of <strong>${monthName} ${year}</strong> is ready. Below is the detailed breakdown:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                  <th style="padding: 10px; text-align: left; color: #475569;">Description</th>
                  <th style="padding: 10px; text-align: right; color: #475569;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: #1e293b;">Basic Salary</td>
                  <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: 500;">₹${Number(payslip.basicSalary).toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: #1e293b;">Allowances</td>
                  <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: 500;">+ ₹${Number(payslip.allowances || 0).toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: #1e293b;">Other Deductions</td>
                  <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: 500;">- ₹${Number(payslip.deductions || 0).toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 10px; color: #1e293b;">LOP Days (${payslip.lopDays || 0} days)</td>
                  <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: 500;">- ₹${Number(payslip.lopDeduction || 0).toFixed(2)}</td>
                </tr>
                <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
                  <td style="padding: 12px; color: #0f172a; font-size: 16px;">Net Take-Home Salary</td>
                  <td style="padding: 12px; text-align: right; color: #0f172a; font-size: 16px;">₹${Number(payslip.netSalary).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            
            <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 20px;">
              <p style="margin: 0; font-size: 13px; color: #475569;">
                <strong>Generated On:</strong> ${new Date(payslip.publishedAt || payslip.generatedAt || Date.now()).toLocaleString()}
              </p>
            </div>
            
            <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
              This is a system-generated document. You can also view and download your payslip anytime in your Employee Portal.
            </p>
          </div>
        </div>
    `;

    const pdfBuffer = await generatePayslipPDF(payslip, employee);

    return sendEmail(
        employee.email, 
        `SM GROUPS - Payslip for ${monthName} ${year}`, 
        "", 
        emailHtml, 
        [
            {
                filename: `Payslip_${employee.name.replace(/\s+/g, "_")}_${payslip.month}.pdf`,
                content: pdfBuffer
            }
        ]
    );
};

// @desc    Pre-calculate LOP and payroll defaults for a month
// @route   GET /api/payslips/calculate
// @access  Admin Only
exports.calculatePayslip = async (req, res) => {
    const { userId, month } = req.query;

    if (!userId || !month) {
        return res.status(400).json({ message: "userId and month (YYYY-MM) are required" });
    }

    try {
        const employee = await User.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        const [yearStr, monthStr] = month.split("-");
        const year = parseInt(yearStr, 10);
        const monthIndex = parseInt(monthStr, 10) - 1;

        if (isNaN(year) || isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
            return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });
        }

        // Get days in the month
        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        // Define month bounds in UTC to avoid local timezone shifts
        const monthStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
        const monthEnd = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

        // Find approved "Unpaid Leave" overlapping this month
        const unpaidLeaves = await Leave.find({
            userId,
            leaveType: "Unpaid Leave",
            status: "approved",
            startDate: { $lte: monthEnd },
            endDate: { $gte: monthStart }
        });

        // Compute LOP overlap days
        let lopDays = 0;
        unpaidLeaves.forEach(leave => {
            const leaveStart = new Date(leave.startDate);
            const leaveEnd = new Date(leave.endDate);

            const overlapStart = new Date(Math.max(leaveStart.getTime(), monthStart.getTime()));
            const overlapEnd = new Date(Math.min(leaveEnd.getTime(), monthEnd.getTime()));
            
            // Clear times in UTC
            overlapStart.setUTCHours(0, 0, 0, 0);
            overlapEnd.setUTCHours(0, 0, 0, 0);

            const diffTime = Math.abs(overlapEnd.getTime() - overlapStart.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            lopDays += diffDays;
        });

        const basicSalary = employee.basicSalary || 0;
        const lopDeduction = daysInMonth > 0 ? Math.round(((basicSalary / daysInMonth) * lopDays) * 100) / 100 : 0;
        const netSalary = Math.max(0, Math.round((basicSalary - lopDeduction) * 100) / 100);

        // Check if payslip already exists for this month
        const existingPayslip = await Payslip.findOne({ userId, month });

        res.json({
            employee: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                staffId: employee.staffId,
                role: employee.role,
                basicSalary,
                department: employee.department || "Operations",
                designation: employee.designation || employee.role?.toUpperCase() || "Staff",
                bankAccount: employee.bankAccount || "",
                ifscCode: employee.ifscCode || ""
            },
            month,
            daysInMonth,
            lopDays,
            lopDeduction,
            netSalary,
            existingPayslip: existingPayslip || null,
            alreadyGenerated: existingPayslip && existingPayslip.status !== "draft"
        });
    } catch (error) {
        console.error("Calculate payslip error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Process payslip (Save Draft | Publish to Dashboard | Publish & Send Email)
// @route   POST /api/payslips/generate
// @access  Admin Only
exports.generatePayslip = async (req, res) => {
    const { 
        userId, 
        month, 
        basicSalary, 
        allowances, 
        bonus,
        deductions, 
        lopDays, 
        lopDeduction, 
        netSalary,
        department,
        designation,
        bankAccount,
        ifscCode,
        paymentMode,
        payDate,
        saveBankToProfile = true,
        action = "publish_and_email" // "draft" | "publish" | "publish_and_email"
    } = req.body;

    if (!userId || !month || basicSalary === undefined || netSalary === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const employee = await User.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // If requested or if bank details changed, sync to employee's user profile for subsequent months
        if (saveBankToProfile && (bankAccount !== undefined || ifscCode !== undefined)) {
            if (bankAccount !== undefined) employee.bankAccount = bankAccount;
            if (ifscCode !== undefined) employee.ifscCode = ifscCode;
            await employee.save();
        }

        // Check if payslip exists
        let payslip = await Payslip.findOne({ userId, month });

        const isDraftAction = action === "draft";
        const isEmailAction = action === "publish_and_email";
        const isPublishAction = action === "publish" || isEmailAction;

        const targetStatus = isDraftAction ? "draft" : "published";

        const finalBankAccount = bankAccount !== undefined ? bankAccount : (employee.bankAccount || "");
        const finalIfscCode = ifscCode !== undefined ? ifscCode : (employee.ifscCode || "");

        if (payslip) {
            // If already published/paid, strictly forbid duplicate generation for that month/year
            if (payslip.status !== "draft") {
                return res.status(400).json({ 
                    message: `A payslip for ${month} has already been generated and finalized for ${employee.name}. Duplicate generation for the same month and year is not permitted.` 
                });
            }

            // If it is a draft, allow updating draft or promoting it to published
            payslip.basicSalary = Number(basicSalary);
            payslip.allowances = Number(allowances || 0);
            payslip.bonus = Number(bonus || 0);
            payslip.deductions = Number(deductions || 0);
            payslip.lopDays = Number(lopDays || 0);
            payslip.lopDeduction = Number(lopDeduction || 0);
            payslip.netSalary = Number(netSalary);
            payslip.department = department || employee.department || "Operations";
            payslip.designation = designation || employee.designation || employee.role?.toUpperCase() || "Staff";
            payslip.bankAccount = finalBankAccount;
            payslip.ifscCode = finalIfscCode;
            payslip.paymentMode = paymentMode || "Bank Transfer";
            payslip.payDate = payDate || "";
            payslip.status = targetStatus;
            payslip.generatedBy = req.user._id;
            payslip.generatedAt = new Date();
            if (isPublishAction && !payslip.publishedAt) {
                payslip.publishedAt = new Date();
            }
            await payslip.save();
        } else {
            payslip = await Payslip.create({
                userId,
                month,
                basicSalary: Number(basicSalary),
                allowances: Number(allowances || 0),
                bonus: Number(bonus || 0),
                deductions: Number(deductions || 0),
                lopDays: Number(lopDays || 0),
                lopDeduction: Number(lopDeduction || 0),
                netSalary: Number(netSalary),
                department: department || employee.department || "Operations",
                designation: designation || employee.designation || employee.role?.toUpperCase() || "Staff",
                bankAccount: finalBankAccount,
                ifscCode: finalIfscCode,
                paymentMode: paymentMode || "Bank Transfer",
                payDate: payDate || "",
                status: targetStatus,
                generatedBy: req.user._id,
                generatedAt: new Date(),
                publishedAt: isPublishAction ? new Date() : undefined
            });
        }

        // 1. If Action is "draft": Only saved to admin page, no notifications or emails
        if (isDraftAction) {
            return res.status(201).json({
                message: `Payslip for ${month} saved as Draft (Admin only). Staff will not see this until published.`,
                payslip
            });
        }

        // 2. If Action is "publish" or "publish_and_email": Notify staff on their dashboard
        try {
            const notification = await Notification.create({
                userId,
                title: "Payslip Published",
                message: `Your payslip for ${month} is now available on your dashboard. Net Pay: ₹${Number(netSalary).toLocaleString('en-IN')}`,
                type: "payslip"
            });

            const io = getIO();
            io.to(userId.toString()).emit("notification", notification);
        } catch (notifErr) {
            console.error("Failed to emit socket notification:", notifErr.message);
        }

        // 3. If Action is "publish" (Dashboard only): Return success immediately without sending email
        if (action === "publish") {
            return res.status(201).json({
                message: `Payslip for ${month} published to staff dashboard successfully!`,
                payslip
            });
        }

        // 4. If Action is "publish_and_email": Send email to staff
        let emailSuccess = false;
        let emailErrorMessage = null;

        try {
            await sendPayslipEmailToStaff(payslip, employee);
            emailSuccess = true;
            payslip.emailSent = true;
            payslip.emailSentAt = new Date();
            await payslip.save();
        } catch (emailErr) {
            console.error("Failed to send payslip email:", emailErr.message);
            emailErrorMessage = emailErr.message;
        }

        if (emailSuccess) {
            return res.status(201).json({
                message: `Payslip for ${month} generated, published to staff dashboard, and emailed to ${employee.email} successfully!`,
                payslip,
                emailSent: true
            });
        } else {
            return res.status(201).json({
                message: `Payslip published to staff dashboard! Note: Email delivery failed (${emailErrorMessage || 'SMTP credential error'}). You can resend from the audit log once email settings are updated.`,
                payslip,
                emailSent: false,
                emailError: emailErrorMessage
            });
        }
    } catch (error) {
        console.error("Generate payslip error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Publish an existing draft payslip to staff dashboard
// @route   POST /api/payslips/:id/publish
// @access  Admin Only
exports.publishDraftPayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        const employee = await User.findById(payslip.userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        payslip.status = "published";
        payslip.publishedAt = new Date();
        await payslip.save();

        // Send dashboard notification
        try {
            const notification = await Notification.create({
                userId: employee._id,
                title: "Payslip Published",
                message: `Your payslip for ${payslip.month} is now available on your dashboard. Net Pay: ₹${Number(payslip.netSalary).toLocaleString('en-IN')}`,
                type: "payslip"
            });

            const io = getIO();
            io.to(employee._id.toString()).emit("notification", notification);
        } catch (notifErr) {
            console.error("Failed to emit socket notification:", notifErr.message);
        }

        res.json({
            message: `Payslip for ${payslip.month} published to ${employee.name}'s dashboard successfully!`,
            payslip
        });
    } catch (error) {
        console.error("Publish draft error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send / Resend payslip email to staff
// @route   POST /api/payslips/:id/send-email
// @access  Admin Only
exports.sendPayslipEmail = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        const employee = await User.findById(payslip.userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // If it was draft, automatically promote it to published
        if (payslip.status === "draft") {
            payslip.status = "published";
            payslip.publishedAt = new Date();
        }

        try {
            await sendPayslipEmailToStaff(payslip, employee);
            payslip.emailSent = true;
            payslip.emailSentAt = new Date();
            await payslip.save();

            return res.json({
                message: `Payslip email sent to ${employee.email} successfully!`,
                payslip,
                emailSent: true
            });
        } catch (emailErr) {
            console.error("Send email error:", emailErr.message);
            await payslip.save();
            return res.status(500).json({
                message: `Failed to send email to ${employee.email}: ${emailErr.message}`,
                emailSent: false
            });
        }
    } catch (error) {
        console.error("Send email route error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payslip history for employees and admin
// @route   GET /api/payslips/history
// @access  Protected
exports.getPayslipHistory = async (req, res) => {
    try {
        let query = {};
        
        // If staff / non-admin, ONLY show published/paid payslips (NEVER show drafts!)
        if (req.user.role !== "admin") {
            query.userId = req.user._id;
            query.status = { $ne: "draft" };
        } else {
            // Admin can filter by userId if provided
            if (req.query.userId) {
                query.userId = req.query.userId;
            }
            if (req.query.status && req.query.status !== "all") {
                query.status = req.query.status;
            }
        }

        if (req.query.month) {
            query.month = req.query.month;
        }

        const history = await Payslip.find(query)
            .populate("userId", "name email staffId role basicSalary")
            .populate("generatedBy", "name")
            .sort({ month: -1, createdAt: -1 });

        res.json(history);
    } catch (error) {
        console.error("Get payslips history error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download Payslip PDF
// @route   GET /api/payslips/:id/download
// @access  Protected
exports.downloadPayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        const employee = await User.findById(payslip.userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Check permission: Admin or Owner of the payslip
        if (req.user.role !== "admin" && payslip.userId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "Not authorized to download this payslip" });
        }

        const pdfBuffer = await generatePayslipPDF(payslip, employee);

        // Set response headers for PDF download
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename=Payslip_${employee.name.replace(/\s+/g, "_")}_${payslip.month}.pdf`
        );

        res.end(pdfBuffer);
    } catch (error) {
        console.error("Download PDF error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete Payslip
// @route   DELETE /api/payslips/:id
// @access  Admin Only
exports.deletePayslip = async (req, res) => {
    try {
        const payslip = await Payslip.findById(req.params.id);
        if (!payslip) {
            return res.status(404).json({ message: "Payslip not found" });
        }

        // Restrict to Admin
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to delete payslips" });
        }

        await Payslip.findByIdAndDelete(req.params.id);

        try {
            const io = getIO();
            io.emit("payslipDeleted", { id: req.params.id });
        } catch (err) {
            console.error("Socket error on payslip delete:", err.message);
        }

        res.json({ message: "Payslip deleted successfully" });
    } catch (error) {
        console.error("Delete payslip error:", error);
        res.status(500).json({ message: error.message });
    }
};

