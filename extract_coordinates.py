import fitz
import sys
sys.stdout.reconfigure(encoding='utf-8')

# Check the Downloads version
import os
paths_to_check = [
    r"C:\Users\Admin\Downloads\InvoiceNITYA.pdf",
    r"C:\billing-system\frontend\dist\InvoiceNITYA.pdf",
    r"C:\billing-system\backend\utils\InvoiceNITYA.pdf",
]

for pdf_path in paths_to_check:
    if os.path.exists(pdf_path):
        size = os.path.getsize(pdf_path)
        print(f"\n{'='*60}")
        print(f"FILE: {pdf_path}  ({size} bytes)")
        print(f"{'='*60}")
        doc = fitz.open(pdf_path)
        page = doc.load_page(0)
        page_h = page.rect.height
        for w in page.get_text("words"):
            x0, y0, x1, y1, word, bn, ln, wn = w
            y_pdflib = page_h - y1
            print(f"  Y={y_pdflib:.0f}  X={x0:.0f}  [{word}]")
        doc.close()
    else:
        print(f"\nNOT FOUND: {pdf_path}")
