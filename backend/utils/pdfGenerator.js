const PDFDocument = require("pdfkit");
const path = require("path");

// Helper to convert number to English words
const numberToWords = (num) => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    // round to integer just in case
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

exports.generateInvoicePDF = (invoice, res) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Stream the PDF directly to the response
    doc.pipe(res);

    // Header Red block
    doc.rect(40, 30, 260, 45).fill('#b91c1c');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('INVOICE', 60, 42);

    // Logo image on the right
    try {
        doc.image(path.join(__dirname, 'logo.png'), 410, 30, { width: 140 });
    } catch (err) {
        // Fallback text if logo is missing or corrupt at runtime
        doc.fillColor('#b91c1c').font('Helvetica-Bold').fontSize(16).text('SM GROUPS', 410, 35, { align: 'right' });
    }

    // Right border vertical accent strip
    doc.rect(550, 30, 10, 45).fill('#444444');

    // Horizontal separator
    doc.moveTo(40, 85).lineTo(560, 85).strokeColor('#CCCCCC').lineWidth(1).stroke();

    // Bill To & Consignee columns
    const columnsY = 95;
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text('INVOICE ON (BILL TO):', 40, columnsY);
    doc.font('Helvetica-Bold').fontSize(9).text(invoice.customerName.toUpperCase(), 40, columnsY + 14);
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text('46, PATTELSHA STREET, Kadathur, Dharmapuri,\nTamil Nadu-635303', 40, columnsY + 26, { width: 220 });
    doc.text(`+91 ${invoice.customerPhone}`, 40, columnsY + 48);

    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8).text('CONSIGNEE TO (SHIP TO):', 300, columnsY);
    doc.font('Helvetica-Bold').fontSize(9).text(invoice.customerName.toUpperCase(), 300, columnsY + 14);
    doc.font('Helvetica').fontSize(8).fillColor('#333333');
    doc.text('46, PATTELSHA STREET, Kadathur, Dharmapuri,\nTamil Nadu-635303', 300, columnsY + 26, { width: 220 });
    doc.text(`+91 ${invoice.customerPhone}`, 300, columnsY + 48);

    // Invoice Metadata
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
    doc.text(`Invoice No: ${invoice.invoiceNumber}`, 300, columnsY + 64);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}`, 300, columnsY + 76);

    // Items table
    const tableTop = 195;
    doc.rect(40, tableTop, 520, 20).fill('#CCCCCC');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(8);
    doc.text('S.NO', 45, tableTop + 6, { width: 30, align: 'center' });
    doc.text('DESCRIPTION', 85, tableTop + 6, { width: 340, align: 'center' });
    doc.text('TOTAL AMOUNT', 435, tableTop + 6, { width: 120, align: 'center' });

    let y = tableTop + 20;
    invoice.items.forEach((item, idx) => {
        // Draw grid cell borders
        doc.rect(40, y, 520, 30).strokeColor('#999999').lineWidth(0.5).stroke();
        
        // Vertical grid lines
        doc.moveTo(75, y).lineTo(75, y + 30).stroke();
        doc.moveTo(430, y).lineTo(430, y + 30).stroke();

        // Row contents
        doc.font('Helvetica').fontSize(8).text(idx + 1, 45, y + 10, { width: 30, align: 'center' });
        doc.font('Helvetica-Bold').fontSize(8).text(item.name.toUpperCase(), 85, y + 10, { width: 340 });
        doc.text(`₹${item.total.toLocaleString()}`, 435, y + 10, { width: 110, align: 'right' });
        
        y += 30;
    });

    // Totals footer row
    doc.rect(40, y, 520, 20).strokeColor('#999999').stroke();
    doc.moveTo(430, y).lineTo(430, y + 20).stroke();
    
    const words = `TOTAL (${numberToWords(invoice.grandTotal).toUpperCase()})`;
    doc.font('Helvetica-Bold').fontSize(7).text(words, 45, y + 6, { width: 380 });
    doc.fontSize(8).text(`₹${invoice.grandTotal.toLocaleString()}`, 435, y + 6, { width: 110, align: 'right' });
    
    y += 20;

    // HSN/SAC breakdown table
    const hsnTop = y + 12;
    doc.rect(40, hsnTop, 520, 15).fill('#EAEAEA');
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(7);
    doc.text('HSN/SAC', 45, hsnTop + 4, { width: 60, align: 'center' });
    doc.text('TAXABLE VALUE', 110, hsnTop + 4, { width: 90, align: 'center' });
    doc.text('CGST (Rate/Amt)', 210, hsnTop + 4, { width: 110, align: 'center' });
    doc.text('SGST (Rate/Amt)', 330, hsnTop + 4, { width: 110, align: 'center' });
    doc.text('Total Tax Amount', 450, hsnTop + 4, { width: 100, align: 'center' });

    const hsnRowY = hsnTop + 15;
    doc.rect(40, hsnRowY, 520, 15).strokeColor('#999999').stroke();
    doc.font('Helvetica').fontSize(8);
    doc.text('Total', 45, hsnRowY + 4, { width: 60, align: 'center' });
    doc.text('-', 110, hsnRowY + 4, { width: 90, align: 'center' });
    doc.text('-', 210, hsnRowY + 4, { width: 110, align: 'center' });
    doc.text('-', 330, hsnRowY + 4, { width: 110, align: 'center' });
    doc.text('-', 450, hsnRowY + 4, { width: 100, align: 'center' });
    
    doc.moveTo(105, hsnTop).lineTo(105, hsnRowY + 15).stroke();
    doc.moveTo(205, hsnTop).lineTo(205, hsnRowY + 15).stroke();
    doc.moveTo(325, hsnTop).lineTo(325, hsnRowY + 15).stroke();
    doc.moveTo(445, hsnTop).lineTo(445, hsnRowY + 15).stroke();

    // Notes
    doc.font('Helvetica-Bold').fontSize(7).text('NOTE:', 40, hsnRowY + 36);
    doc.font('Helvetica').text('Goods are checked and delivered in good condition. No return or exchange will be accepted after delivery.', 70, hsnRowY + 36);

    // Bank Details & Signatory
    const bottomY = hsnRowY + 54;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#000000');
    doc.text('Account Number: 520509010317851', 40, bottomY);
    doc.text('IFSC: CIUB0000188', 40, bottomY + 12);
    doc.text('Account Name: THE SM GROUPS', 40, bottomY + 24);
    doc.text('Branch Name: FAIRLANDS SALEM', 40, bottomY + 36);
    doc.text('Bank Name: CITY UNION BANK', 40, bottomY + 48);

    doc.text('AUTHORIZED SIGNATORY', 380, bottomY, { align: 'center', width: 180 });
    doc.text('MANAGING DIRECTOR', 380, bottomY + 10, { align: 'center', width: 180 });
    
    // Digital Signature Representation
    doc.font('Helvetica-Oblique').fontSize(11).fillColor('#b91c1c').text('P. Gowtham', 380, bottomY + 26, { align: 'center', width: 180 });
    
    doc.fillColor('#000000').font('Helvetica').fontSize(7);
    doc.text('3rd Floor, OM Shiva Towers, 259-B, Advaitha Ashram Rd,\nFairlands, Salem, Tamil Nadu 636016', 350, bottomY + 44, { align: 'right', width: 210 });
    doc.text('+91 9486783278  |  tsmgmdofficial@gmail.com', 350, bottomY + 64, { align: 'right', width: 210 });
    doc.text('www.thesmgroups.com', 350, bottomY + 74, { align: 'right', width: 210 });

    // Swoop Bottom Bars
    doc.rect(40, 785, 260, 12).fill('#b91c1c');
    doc.rect(300, 785, 260, 12).fill('#444444');

    doc.end();
};
