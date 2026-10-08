const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const path = require("path");
const fs = require("fs");

/**
 * Formats a number to Indian currency format with commas and 2 decimals
 */
const formatCurrency = (val) => {
    const num = Number(val || 0);
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Generates a monthly Payslip PDF document matching the exact official SM Groups Payslip Statement design
 * using the official Canva A4 background template (SM_Groups_Payslip_Template.pdf)
 * @param {Object} payslip - The payslip database document
 * @param {Object} employee - The employee user document
 * @returns {Promise<Buffer>} - Resolves with the PDF Buffer
 */
const generatePayslipPDF = async (payslip, employee) => {
    try {
        const templatePath = path.join(__dirname, "SM_Groups_Payslip_Template.pdf");
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template not found: ${templatePath}`);
        }

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();

        // Embed official Logo and Building Sketch
        const logoPath = path.join(__dirname, "sm-groups-logo.png");
        const sketchPath = path.join(__dirname, "building_sketch.png");

        let logoImg = null;
        let sketchImg = null;

        if (fs.existsSync(logoPath)) {
            logoImg = await pdfDoc.embedPng(fs.readFileSync(logoPath));
        }
        if (fs.existsSync(sketchPath)) {
            sketchImg = await pdfDoc.embedPng(fs.readFileSync(sketchPath));
        }

        const fReg = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const cDark = rgb(15 / 255, 23 / 255, 42 / 255);       // #0f172a
        const cBlack = rgb(0, 0, 0);
        const cBorder = rgb(50 / 255, 50 / 255, 50 / 255);     // Dark borders
        const cWhite = rgb(1, 1, 1);

        // ── 1. OFFICIAL SM GROUPS LOGO (TOP CENTER) ───────────────────────────
        if (logoImg) {
            const logoW = 230;
            const logoH = logoW * (logoImg.height / logoImg.width);
            page.drawImage(logoImg, {
                x: (width - logoW) / 2,
                y: 750,
                width: logoW,
                height: logoH
            });
        }

        // ── 2. BUILDING SKETCH & PAYSLIP STATEMENT TITLE ──────────────────────
        if (sketchImg) {
            const skW = 145;
            const skH = skW * (sketchImg.height / sketchImg.width);
            page.drawImage(sketchImg, {
                x: 55,
                y: 645,
                width: skW,
                height: skH
            });
        }

        page.drawText("PAYSLIP STATEMENT", {
            x: 215,
            y: 668,
            size: 26,
            font: fBold,
            color: cDark
        });

        // Horizontal divider line
        page.drawLine({
            start: { x: 55, y: 638 },
            end: { x: 540, y: 638 },
            thickness: 1.5,
            color: cBorder
        });

        // ── 3. EMPLOYEE DETAILS (CLEAN VERTICAL ALIGNMENT, NO BOX) ────────────
        const [yearStr, monthStr] = (payslip.month || "").split("-");
        const monthNames = [
            "January", "February", "March", "April", "May", "June", 
            "July", "August", "September", "October", "November", "December"
        ];
        const monthName = monthNames[parseInt(monthStr, 10) - 1] || payslip.month || "Current Month";
        const fullMonthText = `${monthName} ${yearStr || ""}`.trim();

        let payDateText = payslip.payDate;
        if (!payDateText && yearStr && monthStr) {
            const yearNum = parseInt(yearStr, 10);
            const monthNum = parseInt(monthStr, 10);
            const lastDay = new Date(yearNum, monthNum, 0).getDate();
            payDateText = `${lastDay} ${monthName} ${yearStr}`;
        }
        if (!payDateText) payDateText = "End of Month";

        const designationText = payslip.designation || employee.designation || employee.role?.toUpperCase() || "Staff Member";
        const departmentText = payslip.department || employee.department || "Operations";
        const employeeName = employee.name || payslip.userId?.name || "Staff Member";
        const staffId = employee.staffId || employee.userId?.staffId || payslip.userId?.staffId || "-";

        const empDetails = [
            { label: "Month", val: fullMonthText, bold: false },
            { label: "Employee Name", val: employeeName, bold: true },
            { label: "Employee ID", val: staffId, bold: false },
            { label: "Department", val: departmentText, bold: false },
            { label: "Designation", val: designationText, bold: false },
            { label: "Pay Date", val: payDateText, bold: false }
        ];

        let empY = 612;
        empDetails.forEach(item => {
            page.drawText(item.label, { x: 60, y: empY, size: 11, font: fBold, color: cDark });
            page.drawText(`: ${item.val}`, { x: 190, y: empY, size: 11, font: item.bold ? fBold : fReg, color: cDark, maxWidth: 340 });
            empY -= 19.5;
        });

        // ── 4. EARNINGS SECTION HEADING & TABLE ───────────────────────────────
        empY -= 10;
        page.drawText("Earnings", { x: 60, y: empY, size: 13, font: fBold, color: cDark });

        const tableX = 55;
        const tableW = 485;
        const col1W = 245;
        const col2W = tableW - col1W; // 240
        const rowH = 26;

        let tblY = empY - 32;

        // Header row (Solid Black)
        page.drawRectangle({ x: tableX, y: tblY, width: tableW, height: rowH, color: cBlack });

        const descHdr = "Description";
        const descHdrW = fBold.widthOfTextAtSize(descHdr, 11);
        page.drawText(descHdr, { x: tableX + (col1W - descHdrW) / 2, y: tblY + 8, size: 11, font: fBold, color: cWhite });

        const amtHdr = "Amount (INR)";
        const amtHdrW = fBold.widthOfTextAtSize(amtHdr, 11);
        page.drawText(amtHdr, { x: tableX + col1W + (col2W - amtHdrW) / 2, y: tblY + 8, size: 11, font: fBold, color: cWhite });

        tblY -= rowH;

        const basicSalary = Number(payslip.basicSalary ?? employee.basicSalary ?? 0);
        const allowances = Number(payslip.allowances || 0);
        const bonus = Number(payslip.bonus || 0);
        const lopDays = Number(payslip.lopDays || 0);
        const lopDeduction = Number(payslip.lopDeduction || 0);
        const deductions = Number(payslip.deductions || 0);
        const netSalary = Number(payslip.netSalary !== undefined ? payslip.netSalary : Math.max(0, basicSalary + allowances + bonus - lopDeduction - deductions));

        const rows = [
            { desc: "Basic Salary", amt: formatCurrency(basicSalary) },
            { desc: "Allowance", amt: formatCurrency(allowances) },
            { desc: "Performance Bonus", amt: formatCurrency(bonus) },
            { desc: `LOP Deduction (${lopDays} days)`, amt: lopDeduction > 0 ? `- ${formatCurrency(lopDeduction)}` : "0.00" }
        ];

        if (deductions > 0) {
            rows.push({ desc: "Other Deductions", amt: `- ${formatCurrency(deductions)}` });
        }

        rows.forEach(r => {
            page.drawRectangle({ x: tableX, y: tblY, width: tableW, height: rowH, borderColor: cBorder, borderWidth: 1 });
            page.drawLine({ start: { x: tableX + col1W, y: tblY }, end: { x: tableX + col1W, y: tblY + rowH }, thickness: 1, color: cBorder });

            page.drawText(r.desc, { x: tableX + 15, y: tblY + 8, size: 10.5, font: fReg, color: cDark });

            const aW = fReg.widthOfTextAtSize(r.amt, 10.5);
            page.drawText(r.amt, { x: tableX + col1W + (col2W - aW) / 2, y: tblY + 8, size: 10.5, font: fReg, color: cDark });

            tblY -= rowH;
        });

        // Total Earnings Row
        page.drawRectangle({ x: tableX, y: tblY, width: tableW, height: rowH + 2, borderColor: cBorder, borderWidth: 1.2 });
        page.drawLine({ start: { x: tableX + col1W, y: tblY }, end: { x: tableX + col1W, y: tblY + rowH + 2 }, thickness: 1.2, color: cBorder });

        const totLbl = "Total Earnings";
        const totLblW = fBold.widthOfTextAtSize(totLbl, 11);
        page.drawText(totLbl, { x: tableX + (col1W - totLblW) / 2, y: tblY + 8, size: 11, font: fBold, color: cDark });

        const totVal = formatCurrency(netSalary);
        const totValW = fBold.widthOfTextAtSize(totVal, 11);
        page.drawText(totVal, { x: tableX + col1W + (col2W - totValW) / 2, y: tblY + 8, size: 11, font: fBold, color: cDark });

        // ── 5. PAYMENT & BANK DETAILS (CLEAN VERTICAL ALIGNMENT, NO BOX) ──────
        let payY = tblY - 45;
        const bankAcc = payslip.bankAccount || employee.bankAccount || "-";
        const ifsc = payslip.ifscCode || employee.ifscCode || "-";
        const payMode = payslip.paymentMode || "Bank Transfer";

        const payDetails = [
            { label: "Net Pay", val: formatCurrency(netSalary), bold: true },
            { label: "Bank Account", val: bankAcc, bold: false },
            { label: "IFSC Code", val: ifsc, bold: false },
            { label: "Payment Mode", val: payMode, bold: false }
        ];

        payDetails.forEach(p => {
            page.drawText(p.label, { x: 65, y: payY, size: 11, font: fBold, color: cDark });
            page.drawText(`: ${p.val}`, { x: 185, y: payY, size: 11, font: p.bold ? fBold : fReg, color: cDark, maxWidth: 300 });
            payY -= 20;
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (err) {
        console.error("Error in generatePayslipPDF:", err);
        throw err;
    }
};

module.exports = { generatePayslipPDF };
