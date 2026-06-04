const User = require("../models/User");
const Leave = require("../models/Leave");
const Payslip = require("../models/Payslip");
const Notification = require("../models/Notification");
const { sendEmail } = require("../utils/emailService");
const { getIO } = require("../utils/socketService");
const { generatePayslipPDF } = require("../utils/payslipPdfGenerator");

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
        const alreadyGenerated = await Payslip.findOne({ userId, month });

        res.json({
            employee: {
                id: employee._id,
                name: employee.name,
                email: employee.email,
                staffId: employee.staffId,
                role: employee.role,
                basicSalary
            },
            month,
            daysInMonth,
            lopDays,
            lopDeduction,
            netSalary,
            alreadyGenerated: !!alreadyGenerated
        });
    } catch (error) {
        console.error("Calculate payslip error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate and save payslip, send notification and email
// @route   POST /api/payslips/generate
// @access  Admin Only
exports.generatePayslip = async (req, res) => {
    const { userId, month, basicSalary, allowances, deductions, lopDays, lopDeduction, netSalary } = req.body;

    if (!userId || !month || basicSalary === undefined || netSalary === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const employee = await User.findById(userId);
        if (!employee) {
            return res.status(404).json({ message: "Employee not found" });
        }

        // Check for duplicates
        const existing = await Payslip.findOne({ userId, month });
        if (existing) {
            return res.status(400).json({ message: `Payslip for ${month} has already been generated for this employee.` });
        }

        const payslip = await Payslip.create({
            userId,
            month,
            basicSalary: Number(basicSalary),
            allowances: Number(allowances || 0),
            deductions: Number(deductions || 0),
            lopDays: Number(lopDays || 0),
            lopDeduction: Number(lopDeduction || 0),
            netSalary: Number(netSalary),
            status: "paid",
            generatedBy: req.user._id,
            generatedAt: new Date()
        });

        // 1. Create System Notification for employee
        const notification = await Notification.create({
            userId,
            title: "Payslip Generated",
            message: `Your payslip for ${month} has been successfully generated. Net Pay: INR ${netSalary}`,
            type: "payslip"
        });

        // Emit real-time notification
        try {
            const io = getIO();
            io.to(userId.toString()).emit("notification", notification);
        } catch (ioErr) {
            console.error("Failed to emit socket notification:", ioErr.message);
        }

        // 2. Generate email
        const [yearStr, monthStr] = month.split("-");
        const year = yearStr;
        const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];
        const monthName = monthNames[parseInt(monthStr, 10) - 1] || month;

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; padding: 24px; text-align: center;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: 0.5px;">SM GROUPS</h2>
                <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.85;">Monthly Payslip & LOP Statement</p>
              </div>
              <div style="padding: 24px; background-color: #ffffff;">
                <p style="font-size: 16px; color: #1e293b; margin-top: 0;">Hello <strong>${employee.name}</strong>,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">Your payslip for the month of <strong>${monthName} ${year}</strong> has been generated by the administrator. Below is the detailed breakdown:</p>
                
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
                      <td style="padding: 10px; text-align: right; color: #1e293b; font-weight: 500;">₹${Number(basicSalary).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px; color: #1e293b;">Allowances</td>
                      <td style="padding: 10px; text-align: right; color: #16a34a; font-weight: 500;">+ ₹${Number(allowances || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px; color: #1e293b;">Other Deductions</td>
                      <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: 500;">- ₹${Number(deductions || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #e2e8f0;">
                      <td style="padding: 10px; color: #1e293b;">LOP Days (${lopDays || 0} days)</td>
                      <td style="padding: 10px; text-align: right; color: #dc2626; font-weight: 500;">- ₹${Number(lopDeduction || 0).toFixed(2)}</td>
                    </tr>
                    <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
                      <td style="padding: 12px; color: #0f172a; font-size: 16px;">Net Take-Home Salary</td>
                      <td style="padding: 12px; text-align: right; color: #0f172a; font-size: 16px;">₹${Number(netSalary).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div style="background-color: #f8fafc; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin-top: 20px;">
                  <p style="margin: 0; font-size: 13px; color: #475569;">
                    <strong>Timestamp of Generation:</strong> ${new Date(payslip.generatedAt).toLocaleString()}
                  </p>
                </div>
                
                <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
                  This is a system-generated document. You can also view your complete payslip and LOP history in the Employee Portal.
                </p>
              </div>
            </div>
        `;

        // Generate PDF attachment
        const pdfBuffer = await generatePayslipPDF(payslip, employee);

        sendEmail(
            employee.email, 
            `SM GROUPS - Payslip & LOP Statement for ${monthName} ${year}`, 
            "", 
            emailHtml, 
            [
                {
                    filename: `Payslip_${employee.name.replace(/\s+/g, "_")}_${month}.pdf`,
                    content: pdfBuffer
                }
            ]
        ).catch(err => console.error("Failed to send payslip email:", err.message));

        res.status(201).json({
            message: "Payslip generated successfully. Notification and email dispatched.",
            payslip
        });
    } catch (error) {
        console.error("Generate payslip error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get payslip history for employees and admin
// @route   GET /api/payslips/history
// @access  Protected
exports.getPayslipHistory = async (req, res) => {
    try {
        let query = {};
        
        // If staff/inventory manager, only show their own history
        if (req.user.role !== "admin") {
            query.userId = req.user._id;
        } else {
            // Admin can filter by userId if provided
            if (req.query.userId) {
                query.userId = req.query.userId;
            }
        }

        if (req.query.month) {
            query.month = req.query.month;
        }

        const history = await Payslip.find(query)
            .populate("userId", "name email staffId role")
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

