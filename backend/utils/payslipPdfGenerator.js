const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

/**
 * Generates a monthly Payslip PDF document
 * @param {Object} payslip - The payslip database document
 * @param {Object} employee - The employee user document
 * @returns {Promise<Buffer>} - Resolves with the PDF Buffer
 */
const generatePayslipPDF = (payslip, employee) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50, size: "A4" });
            const buffers = [];

            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });
            doc.on("error", reject);

            // Extract numerical variables safely with defaults
            const basicSalary = Number(payslip.basicSalary || 0);
            const allowances = Number(payslip.allowances || 0);
            const deductions = Number(payslip.deductions || 0);
            const lopDays = Number(payslip.lopDays || 0);
            const lopDeduction = Number(payslip.lopDeduction || 0);
            const netSalary = Number(payslip.netSalary || 0);

            // ─── Header Section ─────────────────────────────────────────────
            const logoPath = path.join(__dirname, "logo.png");
            let headerY = 50;

            if (fs.existsSync(logoPath)) {
                // Render the logo image centered at the top
                doc.image(logoPath, 237, 30, { width: 120 });
                headerY = 80;
            } else {
                // Fallback to text header if logo is missing
                doc.fillColor("#0f172a")
                   .fontSize(20)
                   .text("SM GROUPS", 50, 35, { align: "center", font: "Helvetica-Bold" });
                headerY = 65;
            }

            doc.fillColor("#475569")
               .fontSize(9)
               .text("MONTHLY PAYSLIP & LOP STATEMENT", 50, headerY + 5, { align: "center", font: "Helvetica-Bold" });

            // Line Divider
            doc.strokeColor("#e2e8f0")
               .lineWidth(1.5)
               .moveTo(50, 105)
               .lineTo(545, 105)
               .stroke();

            // ─── Metadata ───────────────────────────────────────────────────
            const monthNames = [
                "January", "February", "March", "April", "May", "June", 
                "July", "August", "September", "October", "November", "December"
            ];
            const [yearStr, monthStr] = payslip.month.split("-");
            const monthName = monthNames[parseInt(monthStr, 10) - 1] || payslip.month;

            doc.fillColor("#1e293b")
               .fontSize(11)
               .text(`Pay Period: ${monthName} ${yearStr}`, 50, 120, { font: "Helvetica-Bold" })
               .text(`Status: ${payslip.status.toUpperCase()}`, 400, 120, { align: "right", font: "Helvetica-Bold" });

            // ─── Employee Info Box ──────────────────────────────────────────
            // Box boundaries: x=50, y=145, width=495, height=75
            doc.rect(50, 145, 495, 75)
               .fillColor("#f8fafc")
               .fillAndStroke()
               .strokeColor("#cbd5e1");

            doc.fillColor("#475569")
               .fontSize(9)
               .text("EMPLOYEE DETAILS", 65, 155, { font: "Helvetica-Bold" });

            doc.fillColor("#1e293b")
               .fontSize(9)
               .text(`Name: ${employee.name}`, 65, 175)
               .text(`Staff ID: ${employee.staffId}`, 65, 192)
               .text(`Role: ${employee.role.toUpperCase()}`, 300, 175)
               .text(`Email: ${employee.email}`, 300, 192);

            // ─── Earnings & Deductions Table ─────────────────────────────────
            // Header Row: y=240, height=20
            doc.rect(50, 240, 495, 20)
               .fillColor("#0f172a")
               .fill();

            doc.fillColor("#ffffff")
               .fontSize(9)
               .text("EARNINGS", 60, 246, { font: "Helvetica-Bold" })
               .text("AMOUNT (INR)", 200, 246, { font: "Helvetica-Bold" })
               .text("DEDUCTIONS", 300, 246, { font: "Helvetica-Bold" })
               .text("AMOUNT (INR)", 450, 246, { font: "Helvetica-Bold" });

            // Table Body
            doc.fillColor("#0f172a")
               .fontSize(9);

            // Row 1: Basic Pay vs LOP
            doc.text("Basic Salary", 60, 275)
               .text(`₹${basicSalary.toFixed(2)}`, 200, 275)
               .text(`LOP Deduction (${lopDays} days)`, 300, 275)
               .text(`₹${lopDeduction.toFixed(2)}`, 450, 275);

            // Row 2: Allowances vs Other Deductions
            doc.text("Allowances / Bonus", 60, 300)
               .text(`+ ₹${allowances.toFixed(2)}`, 200, 300)
               .text("Other Deductions", 300, 300)
               .text(`- ₹${deductions.toFixed(2)}`, 450, 300);

            // Table Border Line
            doc.strokeColor("#cbd5e1")
               .lineWidth(1)
               .moveTo(50, 325)
               .lineTo(545, 325)
               .stroke();

            // ─── Net Salary Callout Box ──────────────────────────────────────
            // Box boundaries: x=50, y=345, width=495, height=40
            doc.rect(50, 345, 495, 40)
               .fillColor("#f1f5f9")
               .fillAndStroke()
               .strokeColor("#94a3b8");

            doc.fillColor("#0f172a")
               .fontSize(11);
            doc.text("NET TAKE-HOME SALARY:", 65, 359, { font: "Helvetica-Bold" });
            doc.text(`₹${netSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 50, 359, { 
                width: 480, 
                align: "right", 
                font: "Helvetica-Bold" 
            });

            // ─── Footer Section ─────────────────────────────────────────────
            doc.fillColor("#64748b")
               .fontSize(8)
               .text(`Generation Timestamp: ${new Date(payslip.generatedAt || payslip.createdAt).toLocaleString()}`, 50, 410)
               .text("This is a system-generated document and does not require a physical signature.", 50, 430, { align: "center" });

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
};

module.exports = { generatePayslipPDF };
