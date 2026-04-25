const PDFDocument = require("pdfkit");

exports.generateInvoicePDF = (invoice, res) => {
    const doc = new PDFDocument({ margin: 50 });

    // Stream the PDF directly to the response
    doc.pipe(res);

    // Header
    doc.fillColor("#444444")
       .fontSize(20)
       .text("THE SM GROUPS", 50, 57)
       .fontSize(10)
       .text("Inventory & Billing System", 50, 80)
       .text("Contact: +91 98765 43210", 50, 95)
       .moveDown();

    // Invoice Info
    doc.fillColor("#000000")
       .fontSize(14)
       .text(`INVOICE: ${invoice.invoiceNumber}`, 400, 57, { align: "right" })
       .fontSize(10)
       .text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 400, 75, { align: "right" })
       .text(`Status: ${invoice.paymentStatus.toUpperCase()}`, 400, 90, { align: "right" })
       .moveDown();

    doc.moveTo(50, 115).lineTo(550, 115).stroke();

    // Customer Info
    doc.fontSize(12).text("Bill To:", 50, 130);
    doc.fontSize(10)
       .text(invoice.customerName, 50, 145)
       .text(invoice.customerPhone, 50, 160)
       .moveDown();

    // Table Header
    const tableTop = 200;
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Item", 50, tableTop);
    doc.text("Price", 250, tableTop, { width: 90, align: "right" });
    doc.text("Qty", 340, tableTop, { width: 90, align: "right" });
    doc.text("Total", 430, tableTop, { width: 120, align: "right" });

    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    doc.font("Helvetica");

    // Table Rows
    let i = 0;
    invoice.items.forEach((item, index) => {
        const y = tableTop + 30 + (index * 25);
        doc.text(item.name, 50, y);
        doc.text(item.price.toFixed(2), 250, y, { width: 90, align: "right" });
        doc.text(item.qty.toString(), 340, y, { width: 90, align: "right" });
        doc.text(item.total.toFixed(2), 430, y, { width: 120, align: "right" });
        i = index;
    });

    // Summary
    const summaryTop = tableTop + 60 + (i * 25);
    doc.moveTo(50, summaryTop).lineTo(550, summaryTop).stroke();

    doc.fontSize(10).text("Subtotal:", 350, summaryTop + 15);
    doc.text(invoice.subtotal.toFixed(2), 450, summaryTop + 15, { align: "right" });

    doc.text("Tax:", 350, summaryTop + 30);
    doc.text(invoice.tax.toFixed(2), 450, summaryTop + 30, { align: "right" });

    doc.text("Discount:", 350, summaryTop + 45);
    doc.text(invoice.discount.toFixed(2), 450, summaryTop + 45, { align: "right" });

    doc.fontSize(12).font("Helvetica-Bold").text("Grand Total:", 350, summaryTop + 65);
    doc.text(`INR ${invoice.grandTotal.toFixed(2)}`, 450, summaryTop + 65, { align: "right" });

    // Footer
    doc.fontSize(10).font("Helvetica-Oblique")
       .text("Thank you for your business!", 50, 700, { align: "center", width: 500 });

    doc.end();
};
