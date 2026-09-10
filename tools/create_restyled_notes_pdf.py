"""Create a non-destructive, visually restyled copy of a scanned notes PDF."""

from io import BytesIO
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter
from pypdf import PdfReader
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


SOURCE = Path(r"C:\Users\kadambari ganore\Downloads\Chapter_1_Introduction to Software Engineering_Notes.pdf")
OUTPUT = Path("output/pdf/Chapter_1_Notes_restyled_handwriting.pdf")
WORK = Path("tmp/pdfs/restyled-pages")


def restyle(image: Image.Image, page_number: int) -> Image.Image:
    """Give the scanned ink a cleaner, more upright blue-black pen appearance."""
    image = image.convert("RGB")
    width, height = image.size

    # A gentle, page-specific affine adjustment changes the character slant and width
    # while retaining all written content, diagrams, and notebook structure.
    shear = (-0.014, -0.009, -0.012)[page_number % 3]
    scale_x = (0.988, 0.994, 0.982)[page_number % 3]
    transformed = image.transform(
        (width, height),
        Image.Transform.AFFINE,
        (1 / scale_x, shear, 0, 0, 1, 0),
        resample=Image.Resampling.BICUBIC,
        fillcolor=(244, 242, 235),
    )

    # Preserve the source's paper and ruling while making the pen look slightly
    # finer, darker, and more consistent.
    transformed = ImageEnhance.Contrast(transformed).enhance(1.16)
    transformed = ImageEnhance.Color(transformed).enhance(0.82)
    transformed = transformed.filter(ImageFilter.UnsharpMask(radius=1.15, percent=118, threshold=3))

    pixels = transformed.load()
    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            # Blue/purple handwriting ink is converted to a deep blue-black gel pen;
            # pale notebook lines and printed boxes remain unchanged.
            if blue > red * 1.12 and blue > green * 1.04 and blue < 205:
                ink = min(blue, 150)
                pixels[x, y] = (max(10, ink // 8), max(17, ink // 6), max(35, ink // 3))
    return transformed


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    reader = PdfReader(SOURCE)
    pdf = canvas.Canvas(str(OUTPUT))
    pdf.setTitle("Chapter 1 - Restyled Handwriting Notes")

    for index, page in enumerate(reader.pages, start=1):
        image = Image.open(BytesIO(page.images[0].data))
        restyled = restyle(image, index)
        page_image = WORK / f"page-{index:02d}.jpg"
        restyled.save(page_image, "JPEG", quality=94, subsampling=0, optimize=True)

        page_width = float(page.mediabox.width)
        page_height = float(page.mediabox.height)
        pdf.setPageSize((page_width, page_height))
        pdf.drawImage(ImageReader(str(page_image)), 0, 0, width=page_width, height=page_height)
        pdf.showPage()

    pdf.save()


if __name__ == "__main__":
    main()
