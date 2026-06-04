// Extract text positions from PDF templates using pdf-lib
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

async function inspectPDF(filePath) {
    const name = path.basename(filePath);
    console.log(`\n${"=".repeat(70)}`);
    console.log(`TEMPLATE: ${name}`);
    console.log(`${"=".repeat(70)}`);
    
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    console.log(`Page size: ${width} x ${height}`);
    
    // Extract all text operations from the content stream
    const content = page.node.Contents();
    if (content) {
        console.log(`Content stream type: ${content.constructor.name}`);
    }
    
    // Try to get annotations
    const annots = page.node.Annots();
    if (annots) {
        console.log(`Annotations found: ${annots.size()}`);
    }
    
    // Get the form/AcroForm if any
    const form = pdfDoc.catalog.lookup(pdfDoc.catalog.get(require("pdf-lib").PDFName.of("AcroForm")));
    if (form) {
        console.log("AcroForm found");
    }
}

(async () => {
    await inspectPDF(path.join(__dirname, "utils", "SM_Groups_Invoice_v3.pdf"));
    await inspectPDF(path.join(__dirname, "utils", "SM_Groups_Quotation.pdf"));
})();
