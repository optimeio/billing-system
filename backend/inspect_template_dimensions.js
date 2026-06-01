const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

async function main() {
    const templatePath = path.join(__dirname, "utils", "InvoiceNITYA.pdf");
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    const page = pdfDoc.getPages()[0];
    const { width, height } = page.getSize();
    console.log(`\n======================================================`);
    console.log(`Template Page size: Width = ${width}pt, Height = ${height}pt`);
    console.log(`Standard A4: Width = 595.27pt, Height = 841.89pt`);
    console.log(`Standard US Letter: Width = 612pt, Height = 792pt`);
    console.log(`======================================================\n`);
}

main().catch(console.error);
