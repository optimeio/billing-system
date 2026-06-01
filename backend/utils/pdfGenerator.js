const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

// Page dimensions: 612 x 792 pt (US Letter)
// All Y coordinates are in pdf-lib system (0 = bottom, 792 = top)

const numberToWords = (num) => {
    const a = ['','one ','two ','three ','four ','five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    num = Math.round(num);
    if (num === 0) return 'zero only';
    if (num.toString().length > 9) return 'amount too large';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += n[1]!=0?(a[Number(n[1])]||b[n[1][0]]+' '+a[n[1][1]])+'crore ':'';
    str += n[2]!=0?(a[Number(n[2])]||b[n[2][0]]+' '+a[n[2][1]])+'lakh ':'';
    str += n[3]!=0?(a[Number(n[3])]||b[n[3][0]]+' '+a[n[3][1]])+'thousand ':'';
    str += n[4]!=0?(a[Number(n[4])]||b[n[4][0]]+' '+a[n[4][1]])+'hundred ':'';
    str += n[5]!=0?((str!='')? 'and ' : '')+(a[Number(n[5])]||b[n[5][0]]+' '+a[n[5][1]])+'only':'only';
    return str.trim();
};

const formatCurrency = (num) => Number(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const wrapText = (text, maxLength) => {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    words.forEach(w => {
        if ((cur + ' ' + w).trim().length <= maxLength) cur = (cur + ' ' + w).trim();
        else { if (cur) lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
};

exports.generateInvoicePDF = async (invoice, res) => {
    try {
        const templatePath = path.join(__dirname, "InvoiceNITYA.pdf");
        if (!fs.existsSync(templatePath)) throw new Error(`Template not found: ${templatePath}`);

        const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize(); // 612 x 792

        const fReg  = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fObl  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        const BLACK = rgb(0, 0, 0);
        const MUTED = rgb(0.2, 0.2, 0.2);
        const WHITE = rgb(1, 1, 1);
        const GREY  = rgb(0.85, 0.85, 0.85);

        // ══════════════════════════════════════════════════
        // 1. ERASE pre-printed "Invoice No:" and "Date:" label area
        //    From PDF analysis: preprinted white boxes at x=389.8..472.8, y_bottom=562..604
        //    Preprinted text labels are around x=290..395 ("Invoice No" and "Date" labels)
        //    We erase the FULL right column from x=280 to cover the preprinted labels + values
        // ══════════════════════════════════════════════════
        page.drawRectangle({ x: 280, y: 556, width: 325, height: 52, color: WHITE });

        // Write dynamic Invoice No and Date in the cleared area
        const invoiceDate = invoice.createdAt
            ? new Date(invoice.createdAt).toLocaleDateString('en-GB')
            : new Date().toLocaleDateString('en-GB');

        page.drawText("Invoice No:", { x: 400, y: 593, size: 9, font: fBold, color: BLACK });
        page.drawText(invoice.invoiceNumber || "", { x: 465, y: 593, size: 9, font: fBold, color: BLACK });
        page.drawText("Date:", { x: 400, y: 573, size: 9, font: fBold, color: BLACK });
        page.drawText(invoiceDate, { x: 465, y: 573, size: 9, font: fBold, color: BLACK });

        // ══════════════════════════════════════════════════
        // 2. CUSTOMER DETAILS (Bill To left, Consignee right)
        //    Headers "INVOICE ON (BILL TO):" and "CONSIGNEE TO (SHIP TO):" are at ~Y=700
        //    Customer name starts at Y=660, address/phone below
        // ══════════════════════════════════════════════════
        const nameUpper = (invoice.customerName || "Walk-in Customer").toUpperCase();

        // Left column: x=34
        page.drawText(nameUpper, { x: 34, y: 660, size: 9, font: fBold, color: BLACK });
        // Right column: x=295
        page.drawText(nameUpper, { x: 295, y: 660, size: 9, font: fBold, color: BLACK });

        let phone = invoice.customerPhone || "";
        if (phone && /^\d{10}$/.test(phone)) phone = `+91 ${phone}`;

        // Left address lines (max 38 chars wide)
        const leftLines = wrapText(invoice.customerAddress || "", 38);
        if (phone) leftLines.push(phone);
        let ly = 648;
        leftLines.forEach(line => {
            page.drawText(line, { x: 34, y: ly, size: 8, font: fReg, color: MUTED });
            ly -= 11;
        });

        // Right address lines (max 26 chars, bounded to x<480 so it won't touch metadata)
        const rightLines = wrapText(invoice.customerAddress || "", 26);
        if (phone) rightLines.push(phone);
        let ry = 648;
        rightLines.forEach(line => {
            page.drawText(line, { x: 295, y: ry, size: 8, font: fReg, color: MUTED });
            ry -= 11;
        });

        // ══════════════════════════════════════════════════
        // 3. LINE ITEMS
        //    From template extraction:
        //    Row 1 S.No "1" is at Y=444, Row 2 "2" at Y=381
        //    Description starts at x=90, Amount right-aligned to x=555
        // ══════════════════════════════════════════════════
        const items = (invoice.items || []).slice(0, 2);
        const rowYs = [444, 381];

        items.forEach((item, idx) => {
            const rowY = rowYs[idx];
            const name = (item.name || "").toUpperCase();
            page.drawText(name, { x: 90, y: rowY, size: 8, font: fBold, color: BLACK, maxWidth: 310, lineHeight: 9 });

            const amt = formatCurrency(item.total);
            const aw = fBold.widthOfTextAtSize(amt, 9);
            page.drawText(amt, { x: 557 - aw, y: rowY, size: 9, font: fBold, color: BLACK });
        });

        // ══════════════════════════════════════════════════
        // 4. GRAND TOTAL ROW
        //    Preprinted text "TOTAL (Four Thousand Tive Hundred Only)" at Y=344
        //    Table right border at x=596. Amount column starts at x=483
        //    Erase preprinted total text + redraw correctly
        // ══════════════════════════════════════════════════

        // Erase preprinted total description (white, inside the table description area x=16..483)
        page.drawRectangle({ x: 16, y: 337, width: 466, height: 18, color: WHITE });
        // Erase preprinted amount cell area (grey background, x=483..596)
        page.drawRectangle({ x: 483, y: 337, width: 113, height: 18, color: GREY });

        const totalWords = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
        page.drawText(totalWords, { x: 24, y: 342, size: 7, font: fBold, color: BLACK, maxWidth: 455, lineHeight: 8 });

        // Amount: right-aligned, staying inside the amount column (x=483..596, right edge x=590)
        const totalAmt = formatCurrency(invoice.grandTotal);
        const taw = fBold.widthOfTextAtSize(totalAmt, 9);
        page.drawText(totalAmt, { x: 590 - taw, y: 342, size: 9, font: fBold, color: BLACK });

        // ══════════════════════════════════════════════════
        // 5. BANK DETAILS & SIGNATURE (bottom section)
        //    Template has wrong account + company name preprinted
        //    Erase the whole info band from Y=85..175 and redraw correctly
        //    Template footer icons (phone, mail, web) are preprinted below Y=85
        //    Contact text will be placed to the RIGHT of the icons, not overlapping
        // ══════════════════════════════════════════════════

        // Erase wrong left bank details block (preprinted at Y=100..162)
        page.drawRectangle({ x: 16, y: 88, width: 310, height: 88, color: WHITE });
        // Erase wrong right signature/director block (preprinted at Y=149..162)
        page.drawRectangle({ x: 330, y: 88, width: 278, height: 88, color: WHITE });

        // Correct bank details (left side)
        page.drawText("Account Number: 530509010317851", { x: 20, y: 168, size: 8, font: fBold, color: BLACK });
        page.drawText("IFSC: CIUB0000188",               { x: 20, y: 156, size: 8, font: fBold, color: BLACK });
        page.drawText("Account Name: THE SM GROUPS",     { x: 20, y: 144, size: 8, font: fBold, color: BLACK });
        page.drawText("Branch Name: FAIRLANDS SALEM",    { x: 20, y: 132, size: 8, font: fBold, color: BLACK });
        page.drawText("Bank Name: CITY UNION BANK",      { x: 20, y: 120, size: 8, font: fBold, color: BLACK });

        // Authorized Signatory block (right side, centered around x=470)
        const cx = 470;
        const authTxt = "AUTHORIZED SIGNATORY";
        page.drawText(authTxt, { x: cx - fBold.widthOfTextAtSize(authTxt, 8)/2, y: 168, size: 8, font: fBold, color: BLACK });
        const mdTxt = "MANAGING DIRECTOR";
        page.drawText(mdTxt,   { x: cx - fBold.widthOfTextAtSize(mdTxt,   8)/2, y: 155, size: 8, font: fBold, color: BLACK });

        // Signature in elegant oblique italic font
        const sigTxt = "Sankar Ganesh";
        page.drawText(sigTxt,  { x: cx - fObl.widthOfTextAtSize(sigTxt, 13)/2, y: 130, size: 13, font: fObl, color: rgb(0.15, 0.15, 0.15) });

        // Company contact details: right side below signature
        // Erase the entire footer icon/text strip on the right side
        page.drawRectangle({ x: 330, y: 40, width: 278, height: 50, color: WHITE });
        page.drawText("IInd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd,", { x: 334, y: 100, size: 7, font: fReg, color: BLACK });
        page.drawText("Fairlands, Salem, Tamil Nadu 636004",                      { x: 334, y: 90,  size: 7, font: fReg, color: BLACK });
        page.drawText("+91 9486783278  |  tsmgmdofficial@gmail.com",              { x: 334, y: 79,  size: 7, font: fReg, color: BLACK });
        page.drawText("www.thesmgroups.com",                                       { x: 334, y: 68,  size: 7, font: fReg, color: BLACK });

        // Save and respond
        const pdfBytes = await pdfDoc.save();
        res.end(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Error generating PDF:", error);
        if (!res.headersSent) res.status(500).json({ message: `PDF generation failed: ${error.message}` });
    }
};
