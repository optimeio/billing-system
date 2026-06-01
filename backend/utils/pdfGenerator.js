const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// Helper to convert number to English words
const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    num = Math.round(num);

    if (num === 0) return 'zero only';
    if (num.toString().length > 9) return 'amount too large';

    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return ''; 
    let str = '';
    str += n[1] != 0 ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
    str += n[2] != 0 ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
    str += n[3] != 0 ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
    str += n[4] != 0 ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
    str += n[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'only' : 'only';
    return str.trim();
};

// Helper to format currency values cleanly without throwing font errors on ₹
const formatCurrency = (num) => {
    return Number(num).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

/**
 * Generates an Invoice PDF by loading the pre-designed template InvoiceNITYA.pdf
 * and drawing the dynamic text fields as an overlay.
 * 
 * @param {Object} invoice - The Mongoose invoice document
 * @param {Object} res - The Express response object
 */
exports.generateInvoicePDF = async (invoice, res) => {
    try {
        // 1. Load the pre-designed PDF template
        const templatePath = path.join(__dirname, "InvoiceNITYA.pdf");
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Invoice template not found at ${templatePath}`);
        }
        
        const templateBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(templateBytes);
        const page = pdfDoc.getPages()[0];

        // 2. Embed standard Helvetica fonts
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const textColor = rgb(0, 0, 0);
        const mutedColor = rgb(0.2, 0.2, 0.2);

        // 3. Write Invoice Number and Date (Top Right Corner)
        // Target: X = 475, Y = 720 for Invoice No | Y = 708 for Date (Letter Height = 792)
        page.drawText(invoice.invoiceNumber || "", {
            x: 475,
            y: 720,
            size: 9,
            font: fontBold,
            color: textColor
        });

        const invoiceDate = invoice.createdAt 
            ? new Date(invoice.createdAt).toLocaleDateString('en-GB') 
            : new Date().toLocaleDateString('en-GB');

        page.drawText(invoiceDate, {
            x: 475,
            y: 708,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 4. Write Bill To (Left Column) and Consignee/Ship To (Right Column) Details
        // Customer Name
        const customerNameUpper = (invoice.customerName || "Walk-in Customer").toUpperCase();
        
        page.drawText(customerNameUpper, {
            x: 50,
            y: 735,
            size: 9,
            font: fontBold,
            color: textColor
        });

        page.drawText(customerNameUpper, {
            x: 300,
            y: 735,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // Customer Address (wrapped cleanly, fallback to blank if empty)
        const addressText = invoice.customerAddress || "";
        if (addressText) {
            page.drawText(addressText, {
                x: 50,
                y: 723,
                size: 8,
                font: fontRegular,
                color: mutedColor,
                maxWidth: 220,
                lineHeight: 10
            });

            page.drawText(addressText, {
                x: 300,
                y: 723,
                size: 8,
                font: fontRegular,
                color: mutedColor,
                maxWidth: 220,
                lineHeight: 10
            });
        }

        // Customer Phone (formatted with +91 if 10-digit number)
        let phoneText = invoice.customerPhone || "";
        if (phoneText) {
            if (/^\d{10}$/.test(phoneText)) {
                phoneText = `+91 ${phoneText}`;
            }
            page.drawText(phoneText, {
                x: 50,
                y: 694,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });

            page.drawText(phoneText, {
                x: 300,
                y: 694,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });
        }

        // 5. Write Line Items (Template has 3 pre-drawn rows)
        // Row 1: Y = 595
        // Row 2: Y = 545
        // Row 3: Y = 495
        const itemsToDraw = (invoice.items || []).slice(0, 3);
        
        itemsToDraw.forEach((item, idx) => {
            const rowY = 595 - (idx * 50);

            // Centered S.No inside column (approx X = 50 to X = 75, mid = 62)
            const sNo = (idx + 1).toString();
            const sNoWidth = fontRegular.widthOfTextAtSize(sNo, 9);
            page.drawText(sNo, {
                x: 62 - (sNoWidth / 2),
                y: rowY,
                size: 9,
                font: fontRegular,
                color: textColor
            });

            // Description / Product Name (wrapped slightly to avoid column boundary)
            const itemNameUpper = (item.name || "").toUpperCase();
            page.drawText(itemNameUpper, {
                x: 90,
                y: rowY,
                size: 8,
                font: fontBold,
                color: textColor,
                maxWidth: 320,
                lineHeight: 9
            });

            // Total Amount (Right-aligned to X = 545)
            const amountText = formatCurrency(item.total);
            const amountWidth = fontBold.widthOfTextAtSize(amountText, 9);
            page.drawText(amountText, {
                x: 545 - amountWidth,
                y: rowY,
                size: 9,
                font: fontBold,
                color: textColor
            });
        });

        // 6. Write Grand Total
        // Words (Grand Total converted to english words, capitalized)
        const totalWords = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
        page.drawText(totalWords, {
            x: 50,
            y: 445,
            size: 7,
            font: fontBold,
            color: textColor,
            maxWidth: 380,
            lineHeight: 8
        });

        // Amount figures (Right-aligned to X = 545)
        const grandTotalText = formatCurrency(invoice.grandTotal);
        const grandTotalWidth = fontBold.widthOfTextAtSize(grandTotalText, 9);
        page.drawText(grandTotalText, {
            x: 545 - grandTotalWidth,
            y: 445,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 7. Write HSN/SAC Total Row (Static row in template at Y = 385)
        // Columns: HSN/SAC (X=72 center), Taxable Value (X=155 center), CGST (X=265 center), SGST (X=385 center), Total Tax (X=502 center)
        const hsnY = 385;

        const hsnLabel = "Total";
        const hsnLabelWidth = fontRegular.widthOfTextAtSize(hsnLabel, 8);
        page.drawText(hsnLabel, {
            x: 72 - (hsnLabelWidth / 2),
            y: hsnY,
            size: 8,
            font: fontRegular,
            color: textColor
        });

        const dash = "-";
        const dashWidth = fontRegular.widthOfTextAtSize(dash, 8);
        const dashPositions = [155, 265, 385, 502];
        dashPositions.forEach(pos => {
            page.drawText(dash, {
                x: pos - (dashWidth / 2),
                y: hsnY,
                size: 8,
                font: fontRegular,
                color: textColor
            });
        });

        // 8. Save and Stream the PDF to response
        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating PDF template overlay:", error);
        // Fallback error response if PDF generation fails completely
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to compile PDF invoice: ${error.message}` });
        }
    }
};
