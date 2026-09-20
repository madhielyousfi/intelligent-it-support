"""Ticket classifier service (Session 6). Graceful when model file is absent."""

import os
from functools import lru_cache
from pathlib import Path


def _repo_root() -> Path:
    here = Path(__file__).resolve()
    for parent in [here.parent, *here.parents]:
        if (parent / "ai" / "ticket_classifier.pkl").exists():
            return parent
    return here.parents[3]


MODEL_PATH = (
    Path(os.environ["AI_MODEL_PATH"])
    if os.environ.get("AI_MODEL_PATH")
    else _repo_root() / "ai" / "ticket_classifier.pkl"
)
MIN_CONFIDENCE = 0.25


@lru_cache(maxsize=1)
def _load():
    if not MODEL_PATH.exists():
        return None
    import joblib

    return joblib.load(MODEL_PATH)


def predict(title: str, description: str) -> tuple[str | None, float | None]:
    model = _load()
    if model is None:
        return None, None
    try:
        text = f"{title}\n{description}"
        proba = model.predict_proba([text])[0]
        best = int(proba.argmax())
        label = str(model.classes_[best])
        conf = round(float(proba[best]), 3)
        if conf < MIN_CONFIDENCE:
            return None, None
        return label, conf
    except Exception:
        return None, None
