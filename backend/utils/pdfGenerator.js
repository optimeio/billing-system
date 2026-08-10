const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const numberToWords = (num) => {
    const a = ['','one ','two ','three ','four ','five ','six ','seven ','eight ','nine ','ten ',
                'eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ',
                'eighteen ','nineteen '];
    const b = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    num = Math.round(num);
    if (num === 0) return 'zero only';
    if (num.toString().length > 9) return 'amount too large';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore '    : '';
    str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh '     : '';
    str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred '  : '';
    str += n[5] != 0 ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only' : 'only';
    return str.trim();
};

const formatCurrency = (num) =>
    Number(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const wrapText = (text, maxLen) => {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
        if ((cur + ' ' + w).trim().length <= maxLen) {
            cur = (cur + ' ' + w).trim();
        } else {
            if (cur) lines.push(cur);
            cur = w;
        }
    });
    if (cur) lines.push(cur);
    return lines;
};

// ═══════════════════════════════════════════════════════════════════════════════
//  INVOICE PDF  — Template: SM_Groups_Invoice_v3.pdf
//
//  Pre-printed label positions (pdf-lib Y = bottom-up):
//    "INVOICE ON (BILL TO):"      x=30,   y=702  → customer info below at ~y=688
//    "CONSIGNEE TO (SHIP TO):"    x=355,  y=702  → same customer info on right
//    "Invoice No:"                x=325,  y=621  → value after label end  x=383
//    "Date:"                      x=325,  y=603  → value after label end  x=355
//    Table headers (S.NO / DESCRIPTION / TOTAL AMOUNT)  y=533
//    Item row 1                   x=55,   y=494
//    Item row 2                   x=55,   y=441
//    Item row 3                   x=55,   y=389
//    Tax table headers            y=317 / y=330 / y=304
//    "Total" row                  x=55,   y=277
//    "NOTE:"                      x=30,   y=240
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateInvoicePDF = async (invoice, res) => {
    try {
        const templatePath = path.join(__dirname, "SM_Groups_Invoice_v3.pdf");
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page   = pdfDoc.getPages()[0];

        const fReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const BLACK = rgb(0, 0, 0);
        const MUTED = rgb(0.25, 0.25, 0.25);

        const invoiceDate = invoice.invoiceDate || invoice.createdAt
            ? new Date(invoice.invoiceDate || invoice.createdAt).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB');

        // ── 1. INVOICE NO + DATE ──────────────────────────────────────────────
        // Align values vertically at x=396
        page.drawText(invoice.invoiceNumber || "", { x: 396, y: 621, size: 10, font: fBold, color: BLACK });
        page.drawText(invoiceDate, { x: 396, y: 603, size: 10, font: fBold, color: BLACK });

        // ── 2. CUSTOMER DETAILS ───────────────────────────────────────────────
        const nameUpper = invoice.customerName ? invoice.customerName.trim().toUpperCase() : "";
        let phone = invoice.customerPhone ? invoice.customerPhone.trim() : "";
        if (phone === "0000000000") phone = "";
        if (phone && /^\d{10}$/.test(phone)) phone = `+91 ${phone}`;

        // LEFT: Bill To — below "INVOICE ON (BILL TO):" label (y=702)
        if (nameUpper) {
            page.drawText(nameUpper, { x: 30, y: 688, size: 9, font: fBold, color: BLACK });
        }
        const addrLines = wrapText(invoice.customerAddress || "", 40);
        if (phone) addrLines.push(phone);
        if (invoice.placeOfSupply) addrLines.push(`Place Of Supply: ${invoice.placeOfSupply}`);
        if (invoice.customerIdNumber) addrLines.push(`GST Number: ${invoice.customerIdNumber}`);
        let ly = nameUpper ? 676 : 688;
        addrLines.forEach(line => {
            page.drawText(line, { x: 30, y: ly, size: 8, font: fReg, color: MUTED });
            ly -= 11;
        });

        // RIGHT: Consignee To — below "CONSIGNEE TO (SHIP TO):" label (y=702)
        if (nameUpper) {
            page.drawText(nameUpper, { x: 355, y: 688, size: 9, font: fBold, color: BLACK });
        }
        const rightLines = wrapText(invoice.customerAddress || "", 30);
        if (phone) rightLines.push(phone);
        if (invoice.placeOfSupply) rightLines.push(`Place Of Supply: ${invoice.placeOfSupply}`);
        if (invoice.customerIdNumber) rightLines.push(`GST Number: ${invoice.customerIdNumber}`);
        let ry = nameUpper ? 676 : 688;
        rightLines.forEach(line => {
            page.drawText(line, { x: 355, y: ry, size: 8, font: fReg, color: MUTED });
            ry -= 11;
        });

        // ── 3. LINE ITEMS ─────────────────────────────────────────────────────
        // Template has 3 item rows. Table columns: S.NO | DESCRIPTION | TOTAL AMOUNT
        // No separate QTY or RATE columns in the template.
        const items = (invoice.items || []).slice(0, 3);
        const rowYs = [494, 441, 389];

        items.forEach((item, idx) => {
            const rowY = rowYs[idx];
            // S.No is already pre-printed (1, 2, 3) in the template — skip drawing it

            // Description — item name only, placed at the description column
            const name = (item.name || "").toUpperCase();
            page.drawText(name, { x: 90, y: rowY, size: 9, font: fBold, color: BLACK, maxWidth: 350 });

            // Total Amount (right-aligned near x≈540)
            const amt = formatCurrency(item.total);
            const aw  = fBold.widthOfTextAtSize(amt, 9);
            page.drawText(amt, { x: 540 - aw, y: rowY, size: 9, font: fBold, color: BLACK });
        });

        // ── 4. TAX TABLE & TOTALS ─────────────────────────────────────────────
        // "Total" row is at y=277. Tax sub-headers at y=317 (HSN, TAXABLE VALUE, TOTAL TAX AMOUNT)
        // and y=304 (RATE, AMOUNT under CGST/SGST)

        // HSN/SAV value — "Total" label is pre-printed at x≈55,y≈277
        // so place HSN code next to "Total" on the left if provided
        if (invoice.hsnCode) {
            page.drawText(invoice.hsnCode, { x: 36, y: 277, size: 8, font: fReg, color: BLACK });
        }

        // Taxable Value
        if (invoice.taxableValue > 0) {
            const subtotalText = formatCurrency(invoice.taxableValue);
            const subW = fBold.widthOfTextAtSize(subtotalText, 8);
            page.drawText(subtotalText, { x: 165 - subW, y: 277, size: 8, font: fBold, color: BLACK });
        }

        // CGST / SGST
        if (invoice.tax > 0) {
            const taxRate = invoice.taxRate > 0 ? invoice.taxRate : (invoice.subtotal > 0 ? (invoice.tax / invoice.subtotal) * 100 : 0);
            const halfRate = (taxRate / 2).toFixed(1).replace(/\.0$/, "");
            const halfAmt = invoice.tax / 2;

            // CGST Rate & Amount (under CGST header)
            page.drawText(`${halfRate}%`, { x: 222, y: 277, size: 8, font: fBold, color: BLACK });
            const cgstAmtText = formatCurrency(halfAmt);
            const cgstW = fBold.widthOfTextAtSize(cgstAmtText, 8);
            page.drawText(cgstAmtText, { x: 298 - cgstW, y: 277, size: 8, font: fBold, color: BLACK });

            // SGST Rate & Amount (under SGST header)
            page.drawText(`${halfRate}%`, { x: 337, y: 277, size: 8, font: fBold, color: BLACK });
            const sgstAmtText = formatCurrency(halfAmt);
            const sgstW = fBold.widthOfTextAtSize(sgstAmtText, 8);
            page.drawText(sgstAmtText, { x: 413 - sgstW, y: 277, size: 8, font: fBold, color: BLACK });

            // Total Tax Amount
            const taxVal = formatCurrency(invoice.tax);
            const taxW = fBold.widthOfTextAtSize(taxVal, 8);
            page.drawText(taxVal, { x: 510 - taxW, y: 277, size: 8, font: fBold, color: BLACK });
        }

        // Grand Total below the table
        const totalAmt = formatCurrency(invoice.grandTotal);
        const gtText = `GRAND TOTAL: Rs. ${totalAmt}`;
        const gtW = fBold.widthOfTextAtSize(gtText, 9.5);
        page.drawText(gtText, { x: 565.3 - gtW, y: 260, size: 9.5, font: fBold, color: BLACK });

        // ── 5. TOTAL IN WORDS ─────────────────────────────────────────────────
        // Placed between "Total" row (y=277) and "NOTE:" (y=240), so at y=260
        const totalWords = numberToWords(invoice.grandTotal).toUpperCase();
        page.drawText(`Rs. ${totalWords}`, { x: 30, y: 260, size: 7.5, font: fBold, color: BLACK, maxWidth: 380, lineHeight: 9 });

        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating Invoice PDF:", error);
        if (!res.headersSent) res.status(500).json({ message: `PDF generation failed: ${error.message}` });
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
//  QUOTATION PDF  — Template: SM_Groups_Quotation.pdf
//
//  Pre-printed label positions (pdf-lib Y = bottom-up):
//    "QUOTATION ON (BILL TO):"    x=30,   y=702  → customer info below at ~y=688
//    "Quotation No:"              x=325,  y=621  → value after label end  x=396
//    "Date:"                      x=325,  y=603  → value after label end  x=355
//    Table headers                y=533
//    Item row 1/2/3               y=494 / y=441 / y=389
//    Tax table + Total            y=277
//    "NOTE:"                      x=30,   y=240
// ═══════════════════════════════════════════════════════════════════════════════
exports.generateQuotationPDF = async (quotation, res) => {
    try {
        const templatePath = path.join(__dirname, "SM_Groups_Quotation.pdf");
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page   = pdfDoc.getPages()[0];

        const fReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const BLACK = rgb(0, 0, 0);
        const MUTED = rgb(0.25, 0.25, 0.25);

        const quotationDate = quotation.invoiceDate || quotation.createdAt
            ? new Date(quotation.invoiceDate || quotation.createdAt).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB');

        // ── 1. QUOTATION NO + DATE ────────────────────────────────────────────
        // Align values vertically at x=396
        page.drawText(quotation.invoiceNumber || "", { x: 396, y: 621, size: 10, font: fBold, color: BLACK });
        page.drawText(quotationDate, { x: 396, y: 603, size: 10, font: fBold, color: BLACK });

        // ── 2. CUSTOMER DETAILS ───────────────────────────────────────────────
        const nameUpper = quotation.customerName ? quotation.customerName.trim().toUpperCase() : "";
        let phone = quotation.customerPhone ? quotation.customerPhone.trim() : "";
        if (phone === "0000000000") phone = "";
        if (phone && /^\d{10}$/.test(phone)) phone = `+91 ${phone}`;

        // Below "QUOTATION ON (BILL TO):" label (y=702)
        if (nameUpper) {
            page.drawText(nameUpper, { x: 30, y: 688, size: 9, font: fBold, color: BLACK });
        }
        const addrLines = wrapText(quotation.customerAddress || "", 40);
        if (phone) addrLines.push(phone);
        if (quotation.placeOfSupply) addrLines.push(`Place Of Supply: ${quotation.placeOfSupply}`);
        if (quotation.customerIdNumber) addrLines.push(`GST Number: ${quotation.customerIdNumber}`);
        let ly = nameUpper ? 676 : 688;
        addrLines.forEach(line => {
            page.drawText(line, { x: 30, y: ly, size: 8, font: fReg, color: MUTED });
            ly -= 11;
        });

        // ── 3. LINE ITEMS ─────────────────────────────────────────────────────
        const items = (quotation.items || []).slice(0, 3);
        const rowYs = [494, 441, 389];

        items.forEach((item, idx) => {
            const rowY = rowYs[idx];
            // S.No is already pre-printed (1, 2, 3) in the template — skip drawing it

            // Description — item name only
            const name = (item.name || "").toUpperCase();
            page.drawText(name, { x: 90, y: rowY, size: 9, font: fBold, color: BLACK, maxWidth: 350 });

            // Total Amount (right-aligned near x≈540)
            const amt = formatCurrency(item.total);
            const aw  = fBold.widthOfTextAtSize(amt, 9);
            page.drawText(amt, { x: 540 - aw, y: rowY, size: 9, font: fBold, color: BLACK });
        });

        // HSN/SAV value — "Total" label is pre-printed at x≈55,y≈277
        // so place HSN code next to "Total" on the left if provided
        if (quotation.hsnCode) {
            page.drawText(quotation.hsnCode, { x: 36, y: 277, size: 8, font: fReg, color: BLACK });
        }

        // Taxable Value
        if (quotation.taxableValue > 0) {
            const subtotalText = formatCurrency(quotation.taxableValue);
            const subW = fBold.widthOfTextAtSize(subtotalText, 8);
            page.drawText(subtotalText, { x: 165 - subW, y: 277, size: 8, font: fBold, color: BLACK });
        }

        // CGST / SGST
        if (quotation.tax > 0) {
            const taxRate = quotation.taxRate > 0 ? quotation.taxRate : (quotation.subtotal > 0 ? (quotation.tax / quotation.subtotal) * 100 : 0);
            const halfRate = (taxRate / 2).toFixed(1).replace(/\.0$/, "");
            const halfAmt = quotation.tax / 2;

            // CGST Rate & Amount (under CGST header)
            page.drawText(`${halfRate}%`, { x: 222, y: 277, size: 8, font: fBold, color: BLACK });
            const cgstAmtText = formatCurrency(halfAmt);
            const cgstW = fBold.widthOfTextAtSize(cgstAmtText, 8);
            page.drawText(cgstAmtText, { x: 298 - cgstW, y: 277, size: 8, font: fBold, color: BLACK });

            // SGST Rate & Amount (under SGST header)
            page.drawText(`${halfRate}%`, { x: 337, y: 277, size: 8, font: fBold, color: BLACK });
            const sgstAmtText = formatCurrency(halfAmt);
            const sgstW = fBold.widthOfTextAtSize(sgstAmtText, 8);
            page.drawText(sgstAmtText, { x: 413 - sgstW, y: 277, size: 8, font: fBold, color: BLACK });

            // Total Tax Amount
            const taxVal = formatCurrency(quotation.tax);
            const taxW = fBold.widthOfTextAtSize(taxVal, 8);
            page.drawText(taxVal, { x: 510 - taxW, y: 277, size: 8, font: fBold, color: BLACK });
        }

        // Grand Total below the table
        const totalAmt = formatCurrency(quotation.grandTotal);
        const gtText = `GRAND TOTAL: Rs. ${totalAmt}`;
        const gtW = fBold.widthOfTextAtSize(gtText, 9.5);
        page.drawText(gtText, { x: 565.3 - gtW, y: 260, size: 9.5, font: fBold, color: BLACK });

        // ── 5. TOTAL IN WORDS ─────────────────────────────────────────────────
        const totalWords = numberToWords(quotation.grandTotal).toUpperCase();
        page.drawText(`Rs. ${totalWords}`, { x: 30, y: 260, size: 7.5, font: fBold, color: BLACK, maxWidth: 380, lineHeight: 9 });

        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating Quotation PDF:", error);
        if (!res.headersSent) res.status(500).json({ message: `PDF generation failed: ${error.message}` });
    }
};
