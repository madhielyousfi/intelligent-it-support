"""Independent OCR processing for screenshots (Session 8).

Standalone: only depends on PIL + pytesseract + the tesseract binary.
Does not touch the ticket flow — the API exposes it as POST /ocr/extract
and the ticket form optionally appends extracted text to the description.
"""

import io
import os
from pathlib import Path


def _ensure_tessdata() -> None:
    """Use user-local eng.traineddata when the system tessdata lacks it (no-sudo hosts)."""
    system = Path("/usr/share/tessdata/eng.traineddata")
    local = Path.home() / ".tessdata" / "eng.traineddata"
    if not system.exists() and local.exists() and "TESSDATA_PREFIX" not in os.environ:
        os.environ["TESSDATA_PREFIX"] = str(local.parent)


_ensure_tessdata()

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 16_000_000
OCR_TIMEOUT_SECONDS = 15


def extract_text(image_bytes: bytes) -> str:
    try:
        import pytesseract
    except ImportError as e:
        raise RuntimeError("pytesseract is not installed") from e
    if not image_bytes:
        raise ValueError("image is empty")
    try:
        # verify() detects truncated/spoofed files without handing them to OCR.
        with Image.open(io.BytesIO(image_bytes)) as probe:
            probe.verify()
        image = Image.open(io.BytesIO(image_bytes))
        image.load()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as e:
        raise ValueError("not a readable image") from e
    if image.width * image.height > MAX_PIXELS:
        raise ValueError("image has too many pixels")
    try:
        # Screenshots often include orientation metadata and colour noise that
        # reduces OCR quality. Normalising them is deterministic and local.
        image = ImageOps.exif_transpose(image).convert("L")
        return pytesseract.image_to_string(image, config="--psm 6", timeout=OCR_TIMEOUT_SECONDS).strip()
    except Exception as e:
        raise RuntimeError(f"OCR engine failed: {e}") from e
