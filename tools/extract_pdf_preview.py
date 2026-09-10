from pathlib import Path

from pypdf import PdfReader


source = Path(r"C:\Users\kadambari ganore\Downloads\Chapter_1_Introduction to Software Engineering_Notes.pdf")
destination = Path("tmp/pdfs/source-page-01.png")
destination.parent.mkdir(parents=True, exist_ok=True)
reader = PdfReader(source)
destination.write_bytes(reader.pages[0].images[0].data)
