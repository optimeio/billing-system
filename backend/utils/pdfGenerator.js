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

// Helper to wrap text cleanly to a maximum character length
const wrapText = (text, maxLength) => {
    if (!text) return [];
    const words = text.split(" ");
    const lines = [];
    let currentLine = "";

    words.forEach(word => {
        if ((currentLine + " " + word).trim().length <= maxLength) {
            currentLine = (currentLine + " " + word).trim();
        } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) lines.push(currentLine);
    return lines;
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

        // 2. Embed standard Helvetica and Bold fonts
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const textColor = rgb(0, 0, 0);
        const mutedColor = rgb(0.2, 0.2, 0.2);

        // 3. Cover and write the pre-printed test Invoice metadata under Consignee box
        // Target: X = 490 to X = 565, Y = 585 to Y = 620 (covering only the old test values)
        page.drawRectangle({
            x: 490,
            y: 585,
            width: 75,
            height: 35,
            color: rgb(1, 1, 1)
        });

        // Write correct Invoice Number and Date (perfectly spaced, drawn together to prevent being "far away")
        const invoiceDate = invoice.createdAt 
            ? new Date(invoice.createdAt).toLocaleDateString('en-GB') 
            : new Date().toLocaleDateString('en-GB');

        page.drawText(`Invoice No: ${invoice.invoiceNumber || ""}`, {
            x: 491,
            y: 608,
            size: 9,
            font: fontBold,
            color: textColor
        });

        page.drawText(`Date: ${invoiceDate}`, {
            x: 491,
            y: 592,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 4. Write Bill To (Left Column) and Consignee/Ship To (Right Column) Details
        // Customer Name
        const customerNameUpper = (invoice.customerName || "Walk-in Customer").toUpperCase();
        
        page.drawText(customerNameUpper, {
            x: 50,
            y: 648,
            size: 9,
            font: fontBold,
            color: textColor
        });

        page.drawText(customerNameUpper, {
            x: 300,
            y: 648,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // Format customer phone cleanly if present
        let phoneText = invoice.customerPhone || "";
        if (phoneText && /^\d{10}$/.test(phoneText)) {
            phoneText = `+91 ${phoneText}`;
        }

        // Bill To Address & Phone Layout (Left Column: wrapped cleanly to max width 38 chars, dynamic shifting)
        const leftLines = wrapText(invoice.customerAddress || "", 38);
        if (phoneText) {
            leftLines.push(phoneText);
        }

        let leftY = 636;
        leftLines.forEach(line => {
            page.drawText(line, {
                x: 50,
                y: leftY,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });
            leftY -= 11;
        });

        // Consignee To Address & Phone Layout (Right Column: wrapped cleanly to max width 26 chars, dynamic shifting)
        const rightLines = wrapText(invoice.customerAddress || "", 26);
        if (phoneText) {
            rightLines.push(phoneText);
        }

        let rightY = 636;
        rightLines.forEach(line => {
            page.drawText(line, {
                x: 300,
                y: rightY,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });
            rightY -= 11;
        });

        // 5. Write Line Items (Template has exactly 2 pre-drawn rows spaced by 63.5 points)
        // Row 1: Y = 447
        // Row 2: Y = 384
        // Note: S.No (1 and 2) is already pre-printed on the background template, so we don't draw it.
        const itemsToDraw = (invoice.items || []).slice(0, 2);

        itemsToDraw.forEach((item, idx) => {
            const rowY = idx === 0 ? 447 : 384;

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

        // 6. Write Grand Total (Y = 341 - perfectly centered inside pre-printed Totals Row bar)
        // Cover only the old pre-printed text parts to keep left/right borders and grid lines intact
        
        // Cover old grand total words
        page.drawRectangle({
            x: 80,
            y: 338,
            width: 280,
            height: 14,
            color: rgb(0.85, 0.85, 0.85) // Match the exact grey color of the bar
        });

        // Cover old grand total figures
        page.drawRectangle({
            x: 500,
            y: 338,
            width: 55,
            height: 14,
            color: rgb(0.85, 0.85, 0.85) // Match the exact grey color of the bar
        });

        // Words (Grand Total converted to english words, capitalized)
        const totalWords = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
        page.drawText(totalWords, {
            x: 90,
            y: 341,
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
            y: 341,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 7. Save and Stream the PDF to response
        // Note: The template's bottom bank details, contact details, and signature section 
        // are 100% correct, authentic, and beautifully pre-printed. We do NOT cover or redraw them!
        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating PDF template overlay:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to compile PDF invoice: ${error.message}` });
        }
    }
};
