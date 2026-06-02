const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// Page: 612 x 792 pt. All Y values in pdf-lib coords (0=bottom, 792=top).
// InvoiceNITYA.pdf has correct preprinted data — we ONLY overlay dynamic fields.

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

exports.generateInvoicePDF = async (invoice, res) => {
    try {
        const templatePath = path.join(__dirname, "InvoiceNITYA.pdf");
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page   = pdfDoc.getPages()[0];

        const fReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fObl  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        const BLACK = rgb(0, 0, 0);
        const MUTED = rgb(0.2, 0.2, 0.2);
        const WHITE = rgb(1, 1, 1);
        const GREY  = rgb(0.85, 0.85, 0.85);

        // ══════════════════════════════════════════════════════════
        // 1. INVOICE NO + DATE
        //    Template has placeholder text: "GGG" at Y=585, X=438
        //    and "Fgvvgvgvgggf2" at Y=565, X=406
        //    These are inside white box areas in the template.
        //    Erase just those placeholder boxes and write real values.
        // ══════════════════════════════════════════════════════════
        const invoiceDate = invoice.createdAt
            ? new Date(invoice.createdAt).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB');

        // Erase placeholder in "Invoice No" white box (x=397..502, y=584..604)
        page.drawRectangle({ x: 397, y: 583, width: 108, height: 22, color: WHITE });
        // Erase placeholder in "Date" white box (x=397..485, y=565..584)
        page.drawRectangle({ x: 397, y: 563, width: 92,  height: 22, color: WHITE });

        page.drawText(invoice.invoiceNumber || "", { x: 403, y: 591, size: 9, font: fBold, color: BLACK });
        page.drawText(invoiceDate,                 { x: 403, y: 571, size: 9, font: fBold, color: BLACK });

        // ══════════════════════════════════════════════════════════
        // 2. CUSTOMER DETAILS — Bill To (left) and Consignee To (right)
        //    Headers preprinted at ~Y=700. Customer data goes below.
        //    Erase both customer zones first so template text doesn't bleed.
        // ══════════════════════════════════════════════════════════
        const nameUpper = (invoice.customerName || "Walk-in Customer").toUpperCase();

        let phone = invoice.customerPhone || "";
        if (phone && /^\d{10}$/.test(phone)) phone = `+91 ${phone}`;

        // Erase LEFT customer zone (Bill To): x=14..265, y=620..670
        page.drawRectangle({ x: 14, y: 618, width: 251, height: 58, color: WHITE });

        // LEFT: Bill To — x=34
        page.drawText(nameUpper, { x: 34, y: 660, size: 9, font: fBold, color: BLACK });
        const leftLines = wrapText(invoice.customerAddress || "", 38);
        if (phone) leftLines.push(phone);
        let ly = 648;
        leftLines.forEach(line => {
            page.drawText(line, { x: 34, y: ly, size: 8, font: fReg, color: MUTED });
            ly -= 11;
        });

        // Erase RIGHT customer zone (Consignee/Ship To): x=275..590, y=620..670
        page.drawRectangle({ x: 275, y: 618, width: 315, height: 58, color: WHITE });

        // RIGHT: Consignee To — x=295
        page.drawText(nameUpper, { x: 295, y: 660, size: 9, font: fBold, color: BLACK });
        const rightLines = wrapText(invoice.customerAddress || "", 26);
        if (phone) rightLines.push(phone);
        let ry = 648;
        rightLines.forEach(line => {
            page.drawText(line, { x: 295, y: ry, size: 8, font: fReg, color: MUTED });
            ry -= 11;
        });


        // ══════════════════════════════════════════════════════════
        // 3. LINE ITEMS (max 2 rows — template has rows at Y=444, Y=381)
        //    S.No column x=34, Description x=90, Amount right-aligned x=590
        // ══════════════════════════════════════════════════════════
        const items = (invoice.items || []).slice(0, 2);
        const rowYs = [444, 381];

        items.forEach((item, idx) => {
            const rowY = rowYs[idx];
            const name = (item.name || "").toUpperCase();
            page.drawText(name, { x: 90, y: rowY, size: 8, font: fBold, color: BLACK, maxWidth: 310, lineHeight: 9 });

            const amt = formatCurrency(item.total);
            const aw  = fBold.widthOfTextAtSize(amt, 9);
            page.drawText(amt, { x: 590 - aw, y: rowY, size: 9, font: fBold, color: BLACK });
        });

        // ══════════════════════════════════════════════════════════
        // 4. GRAND TOTAL ROW
        //    Template has preprinted placeholder: "TOTAL (Four Thousand Tive Hundred Only)"
        //    at Y=344, x=152..327 — erase it and write real total words.
        //    Amount column: x=483..596
        // ══════════════════════════════════════════════════════════

        // Erase preprinted placeholder total words (description cell: x=16..483)
        page.drawRectangle({ x: 16,  y: 337, width: 466, height: 17, color: WHITE });
        // Erase amount cell and restore grey background
        page.drawRectangle({ x: 483, y: 337, width: 113, height: 17, color: GREY  });

        const totalWords = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
        page.drawText(totalWords, { x: 22, y: 342, size: 7, font: fBold, color: BLACK, maxWidth: 458, lineHeight: 8 });

        const totalAmt = formatCurrency(invoice.grandTotal);
        const taw = fBold.widthOfTextAtSize(totalAmt, 9);
        page.drawText(totalAmt, { x: 590 - taw, y: 342, size: 9, font: fBold, color: BLACK });

        // ══════════════════════════════════════════════════════════
        // NOTE: Bank details, Authorized Signatory, Managing Director,
        // contact info, and www footer are ALL preprinted in the
        // InvoiceNITYA.pdf template — we DO NOT touch them.
        // ══════════════════════════════════════════════════════════

        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating PDF:", error);
        if (!res.headersSent) res.status(500).json({ message: `PDF generation failed: ${error.message}` });
    }
};
