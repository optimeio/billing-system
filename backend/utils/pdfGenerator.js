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

        // 2. Embed standard Helvetica and Oblique fonts
        const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        const textColor = rgb(0, 0, 0);
        const mutedColor = rgb(0.2, 0.2, 0.2);

        // 3. Cover the pre-printed misaligned Invoice No & Date labels under Consignee box
        // Target: X = 380 to X = 570, Y = 565 to Y = 600
        page.drawRectangle({
            x: 380,
            y: 565,
            width: 190,
            height: 35,
            color: rgb(1, 1, 1)
        });

        // Write correct Invoice Number and Date right next to their top-right pre-printed label coordinates
        page.drawText(invoice.invoiceNumber || "", {
            x: 495,
            y: 592,
            size: 9,
            font: fontBold,
            color: textColor
        });

        const invoiceDate = invoice.createdAt 
            ? new Date(invoice.createdAt).toLocaleDateString('en-GB') 
            : new Date().toLocaleDateString('en-GB');

        page.drawText(invoiceDate, {
            x: 495,
            y: 573,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 4. Write Bill To (Left Column) and Consignee/Ship To (Right Column) Details
        // Customer Name
        const customerNameUpper = (invoice.customerName || "Walk-in Customer").toUpperCase();
        
        page.drawText(customerNameUpper, {
            x: 50,
            y: 640,
            size: 9,
            font: fontBold,
            color: textColor
        });

        page.drawText(customerNameUpper, {
            x: 300,
            y: 640,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // Customer Address (wrapped cleanly, fallback to blank if empty)
        const addressText = invoice.customerAddress || "";
        if (addressText) {
            page.drawText(addressText, {
                x: 50,
                y: 628,
                size: 8,
                font: fontRegular,
                color: mutedColor,
                maxWidth: 220,
                lineHeight: 10
            });

            page.drawText(addressText, {
                x: 300,
                y: 628,
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
                y: 590,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });

            page.drawText(phoneText, {
                x: 300,
                y: 590,
                size: 8,
                font: fontRegular,
                color: mutedColor
            });
        }

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

        // 6. Write Grand Total (Y = 346 - perfectly centered inside pre-printed Totals Row bar)
        // Words (Grand Total converted to english words, capitalized)
        const totalWords = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
        
        // Cover old grand total text before redrawing new dynamic grand total words/numbers
        page.drawRectangle({
            x: 45,
            y: 338,
            width: 520,
            height: 12,
            color: rgb(1, 1, 1)
        });

        page.drawText(totalWords, {
            x: 50,
            y: 340,
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
            y: 340,
            size: 9,
            font: fontBold,
            color: textColor
        });

        // 7. Write HSN/SAC Total Row (Static row in template at Y = 285)
        // Columns: HSN/SAC (X=72 center), Taxable Value (X=155 center), CGST (X=265 center), SGST (X=385 center), Total Tax (X=502 center)
        const hsnY = 285;

        // Cover old HSN totals row before redrawing new ones
        page.drawRectangle({
            x: 22,
            y: 278,
            width: 545,
            height: 12,
            color: rgb(1, 1, 1)
        });

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

        // 8. Cover and Redraw Bank details & signature section (Y = 40 to Y = 160)
        // Erases pre-printed R. Sankarganesh signature and wrong bank accounts of TSMG
        
        // Cover bottom left bank details area
        page.drawRectangle({
            x: 25,
            y: 40,
            width: 295,
            height: 120,
            color: rgb(1, 1, 1)
        });

        // Cover bottom right signature and contact details area
        page.drawRectangle({
            x: 330,
            y: 40,
            width: 242,
            height: 120,
            color: rgb(1, 1, 1)
        });

        // Draw correct Bank Details (CITY UNION BANK Salem)
        page.drawText("Account Number: 520509010317851", { x: 30, y: 151, size: 8, font: fontBold, color: textColor });
        page.drawText("IFSC: CIUB0000188", { x: 30, y: 139, size: 8, font: fontBold, color: textColor });
        page.drawText("Account Name: THE SM GROUPS", { x: 30, y: 127, size: 8, font: fontBold, color: textColor });
        page.drawText("Branch Name: FAIRLANDS SALEM", { x: 30, y: 115, size: 8, font: fontBold, color: textColor });
        page.drawText("Bank Name: CITY UNION BANK", { x: 30, y: 103, size: 8, font: fontBold, color: textColor });

        // Draw correct Authorized Signatory labels
        const authText = "AUTHORIZED SIGNATORY";
        const authWidth = fontBold.widthOfTextAtSize(authText, 8);
        page.drawText(authText, { x: 450 - (authWidth / 2), y: 145, size: 8, font: fontBold, color: textColor });

        const mdText = "MANAGING DIRECTOR";
        const mdWidth = fontBold.widthOfTextAtSize(mdText, 8);
        page.drawText(mdText, { x: 450 - (mdWidth / 2), y: 133, size: 8, font: fontBold, color: textColor });

        // Draw signature P. Gowtham beautifully in red cursive-like font
        const sigText = "P. Gowtham";
        const sigWidth = fontOblique.widthOfTextAtSize(sigText, 12);
        page.drawText(sigText, { x: 450 - (sigWidth / 2), y: 111, size: 12, font: fontOblique, color: rgb(0.72, 0.11, 0.11) });

        // Draw correct Company Contact Details
        const contact1 = "3rd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd,";
        const w1 = fontRegular.widthOfTextAtSize(contact1, 7);
        page.drawText(contact1, { x: 560 - w1, y: 90, size: 7, font: fontRegular, color: textColor });

        const contact2 = "Fairlands, Salem, Tamil Nadu 636016";
        const w2 = fontRegular.widthOfTextAtSize(contact2, 7);
        page.drawText(contact2, { x: 560 - w2, y: 80, size: 7, font: fontRegular, color: textColor });

        const contact3 = "+91 9486783278  |  tsmgmdofficial@gmail.com";
        const w3 = fontRegular.widthOfTextAtSize(contact3, 7);
        page.drawText(contact3, { x: 560 - w3, y: 68, size: 7, font: fontRegular, color: textColor });

        const contact4 = "www.thesmgroups.com";
        const w4 = fontRegular.widthOfTextAtSize(contact4, 7);
        page.drawText(contact4, { x: 560 - w4, y: 56, size: 7, font: fontRegular, color: textColor });

        // 9. Save and Stream the PDF to response
        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating PDF template overlay:", error);
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to compile PDF invoice: ${error.message}` });
        }
    }
};
