const fs = require("fs");
const path = require("path");
const { generateInvoicePDF } = require("./backend/utils/pdfGenerator");

// Mock sample invoice data
const sampleInvoice = {
    invoiceNumber: "INV006",
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    customerName: "Aadhithiyan V",
    customerAddress: "New vaniyankula street, Tiruvannamalai",
    customerPhone: "1234567890",
    items: [
        { name: "Rocket Stove", total: 3408 }
    ],
    grandTotal: 3408
};

// Mock Express response object to capture the PDF buffer and write to disk
const mockRes = {
    headersSent: false,
    status: function() {
        return this;
    },
    json: function(data) {
        console.error("JSON Response Error:", data);
    },
    end: function(pdfBuffer) {
        const outputPath = path.join(__dirname, "sample_invoice.pdf");
        fs.writeFileSync(outputPath, pdfBuffer);
        console.log(`\n======================================================`);
        console.log(`SUCCESS: Real sample PDF invoice generated!`);
        console.log(`File saved to: ${outputPath}`);
        console.log(`======================================================\n`);
    }
};

// Run the generator
(async () => {
    try {
        console.log("Generating sample invoice PDF...");
        await generateInvoicePDF(sampleInvoice, mockRes);
    } catch (err) {
        console.error("Generation failed:", err);
    }
})();
