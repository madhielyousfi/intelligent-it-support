import sys
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.models import User
from app.services import get_current_user

def _ai_dir() -> str:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "ai" / "ocr.py").exists():
            return str(parent / "ai")
    return str(here.parents[3] / "ai")


sys.path.insert(0, _ai_dir())

router = APIRouter(prefix="/ocr", tags=["ocr"])
ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


@router.post("/extract")
async def extract(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="file must be a PNG, JPEG, or WebP image")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="image is empty")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="image too large (max 5MB)")
    try:
        from ocr import extract_text
    except ImportError:
        raise HTTPException(status_code=503, detail="OCR module unavailable")
    try:
        text = extract_text(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError:
        raise HTTPException(status_code=503, detail="OCR service could not process this image")
    return {"text": text, "characters": len(text)}
