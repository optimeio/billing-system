require('dotenv').config();
const { generateInvoicePDF, generateQuotationPDF } = require('./utils/pdfGenerator');
const fs = require('fs');
const path = require('path');

const mockRes = (outputPath) => {
    return {
        headersSent: false,
        status: (code) => ({
            json: (msg) => console.log(`Error ${code}:`, msg)
        }),
        end: (buffer) => {
            fs.writeFileSync(outputPath, buffer);
            console.log(`Saved to ${outputPath}`);
        }
    };
};

const invoiceFilled = {
    invoiceNumber: "INV-1001",
    createdAt: new Date("2026-06-04T12:00:00.000Z"),
    customerName: "John Doe",
    customerAddress: "123 Main St, New York, NY 10001",
    customerPhone: "9488316728",
    hsnCode: "99",
    items: [
        { name: "Product A", total: 100 },
        { name: "Product B", total: 200 }
    ],
    subtotal: 300,
    taxableValue: 300,
    taxRate: 10,
    tax: 30,
    discount: 10,
    grandTotal: 320
};

const invoiceEmpty = {
    invoiceNumber: "INV-1002",
    createdAt: new Date("2026-06-04T12:00:00.000Z"),
    customerName: "",
    customerAddress: "123 Main St, New York, NY 10001",
    customerPhone: "",
    hsnCode: "",
    items: [
        { name: "Product A", total: 100 },
        { name: "Product B", total: 200 }
    ],
    subtotal: 300,
    taxableValue: 0,
    taxRate: 0,
    tax: 0,
    discount: 0,
    grandTotal: 300
};

const quotationFilled = {
    invoiceNumber: "QT-1001",
    createdAt: new Date("2026-06-04T12:00:00.000Z"),
    customerName: "Jane Doe",
    customerAddress: "456 Market St, San Francisco, CA 94105",
    customerPhone: "9488316728",
    hsnCode: "99",
    items: [
        { name: "Service A", total: 500 },
        { name: "Service B", total: 1500 }
    ],
    subtotal: 2000,
    taxableValue: 2000,
    taxRate: 18,
    tax: 360,
    discount: 50,
    grandTotal: 2310
};

const quotationEmpty = {
    invoiceNumber: "QT-1002",
    createdAt: new Date("2026-06-04T12:00:00.000Z"),
    customerName: "",
    customerAddress: "456 Market St, San Francisco, CA 94105",
    customerPhone: "",
    hsnCode: "",
    items: [
        { name: "Service A", total: 500 },
        { name: "Service B", total: 1500 }
    ],
    subtotal: 2000,
    taxableValue: 0,
    taxRate: 0,
    tax: 0,
    discount: 0,
    grandTotal: 2000
};

(async () => {
    const artDir = "C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\a6b1fb3c-0b9c-42ac-bc44-ac4d0ad97b29";
    
    await generateInvoicePDF(invoiceFilled, mockRes(path.join(artDir, 'test_invoice_filled.pdf')));
    await generateInvoicePDF(invoiceEmpty, mockRes(path.join(artDir, 'test_invoice_empty.pdf')));
    await generateQuotationPDF(quotationFilled, mockRes(path.join(artDir, 'test_quotation_filled.pdf')));
    await generateQuotationPDF(quotationEmpty, mockRes(path.join(artDir, 'test_quotation_empty.pdf')));
    
    process.exit(0);
})();
