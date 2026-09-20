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


@router.post("/extract")
async def extract(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="image too large (max 5MB)")
    try:
        from ocr import extract_text
    except ImportError:
        raise HTTPException(status_code=503, detail="OCR module unavailable")
    try:
        text = extract_text(data)
    except ValueError:
        raise HTTPException(status_code=400, detail="not a readable image")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"text": text}
