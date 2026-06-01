import fitz # PyMuPDF
import os

pdf_path = r"c:\billing-system\sample_invoice.pdf"
output_path = r"C:\Users\Admin\.gemini\antigravity-ide\brain\8b5523b8-dcfa-461d-a086-0b85750febd2\sample_invoice.png"

try:
    print(f"Loading PDF: {pdf_path}")
    doc = fitz.open(pdf_path)
    page = doc.load_page(0) # first page
    
    # render page to a pixmap (image) at high resolution (150 dpi)
    pix = page.get_pixmap(dpi=150)
    print(f"Saving PNG image to: {output_path}")
    pix.save(output_path)
    
    print("\n======================================================")
    print("SUCCESS: Real PDF converted to PNG successfully via PyMuPDF!")
    print(f"Image saved to: {output_path}")
    print("======================================================\n")
except Exception as e:
    print("Conversion failed:", e)
