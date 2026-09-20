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

from PIL import Image


def extract_text(image_bytes: bytes) -> str:
    try:
        import pytesseract
    except ImportError as e:
        raise RuntimeError("pytesseract is not installed") from e
    try:
        image = Image.open(io.BytesIO(image_bytes))
    except Exception as e:
        raise ValueError("not a readable image") from e
    try:
        return pytesseract.image_to_string(image).strip()
    except Exception as e:
        raise RuntimeError(f"OCR engine failed: {e}") from e
