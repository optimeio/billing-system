const pdf2img = require('pdf-img-convert');
const fs = require('fs');
const path = require('path');

async function convert() {
    try {
        const pdfPath = path.join(__dirname, "..", "sample_invoice.pdf");
        console.log(`Loading PDF from: ${pdfPath}`);
        
        // Convert to images
        const outputImages = await pdf2img.convert(pdfPath, {
            width: 1000 // high-resolution width
        });
        
        // Save the first page as PNG
        const targetPath = "C:\\Users\\Admin\\.gemini\\antigravity-ide\\brain\\8b5523b8-dcfa-461d-a086-0b85750febd2\\sample_invoice.png";
        fs.writeFileSync(targetPath, outputImages[0]);
        console.log(`\n======================================================`);
        console.log(`SUCCESS: Real PDF converted to PNG image!`);
        console.log(`File saved to: ${targetPath}`);
        console.log(`======================================================\n`);
    } catch (error) {
        console.error("Conversion failed:", error);
    }
}

convert();
