"""Baseline ticket-category classifier (Session 5/6).

Trains TF-IDF + LogisticRegression on:
  1. a small built-in bootstrap corpus (so the pipeline works before real volume exists), plus
  2. every ticket in Postgres that already has a human-set category (real data wins over time).

Artifacts: ai/ticket_classifier.pkl, ai/labels.json
Retrain anytime:  python ai/train.py   (then restart the API)
"""

from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

AI_DIR = Path(__file__).resolve().parent
MODEL_PATH = AI_DIR / "ticket_classifier.pkl"

BOOTSTRAP = [
    # Network
    ("VPN keeps disconnecting", "VPN drops every hour when working from home", "Network"),
    ("Wifi very slow on 3rd floor", "Pages time out, signal weak in meeting rooms", "Network"),
    ("Cannot reach file server", "Timeout connecting to fileserver over LAN", "Network"),
    ("DNS not resolving intranet", "Internal hostnames fail, external sites work", "Network"),
    ("Video calls freezing", "Teams calls freeze, likely bandwidth or latency", "Network"),
    # Hardware
    ("Laptop won't power on", "No lights, charger connected, still dead", "Hardware"),
    ("Printer offline", "Printer shows offline, jobs stuck in queue", "Hardware"),
    ("Keyboard keys stuck", "Several keys repeat or don't register", "Hardware"),
    ("Monitor flickering", "External display flickers over HDMI", "Hardware"),
    ("Battery drains fast", "Battery lasts 40 minutes after full charge", "Hardware"),
    # Software
    ("App crashes on save", "CRM client crashes every time I save a record", "Software"),
    ("Update broke login screen", "After the update the login button does nothing", "Software"),
    ("Spreadsheet formula error", "Formulas recalc wrong after macro run", "Software"),
    ("Browser tab hangs", "Web app tab freezes with large reports", "Software"),
    ("Install new version", "Need the latest release of the design tool", "Software"),
    # Access
    ("Password reset please", "Locked out after too many attempts", "Access"),
    ("Need access to shared folder", "Request read access to finance share", "Access"),
    ("New joiner account", "Create AD account and mailbox for new hire", "Access"),
    ("VPN token expired", "MFA token expired, cannot approve logins", "Access"),
    ("Admin rights for install", "Need temporary elevation to install printer driver", "Access"),
    # Email
    ("Cannot send email", "Outgoing mail bounces with error 550", "Email"),
    ("Mailbox full warning", "Quota exceeded, cannot receive new mail", "Email"),
    ("Missing emails from client", "Expected messages never arrived, no spam trace", "Email"),
    ("Shared mailbox permission", "Cannot open support inbox after role change", "Email"),
    ("Email signature wrong", "New branding signature not applying in client", "Email"),
]


def load_db_samples():
    """Pull (title, description, category_name) for tickets with a human category."""
    import sys

    sys.path.insert(0, str(AI_DIR.parent / "backend"))
    try:
        from app.core.database import SessionLocal
        from app.models import Category, Ticket
    except Exception as e:
        print(f"DB samples skipped ({e})")
        return []
    db = SessionLocal()
    try:
        rows = (
            db.query(Ticket.title, Ticket.description, Category.name)
            .join(Category, Category.id == Ticket.category_id)
            .filter(Ticket.category_id.isnot(None))
            .all()
        )
        return [(t, d, c) for t, d, c in rows]
    finally:
        db.close()


def main() -> None:
    samples = list(BOOTSTRAP) + load_db_samples()
    X = [f"{t}\n{d}" for t, d, _ in samples]
    y = [c for _, _, c in samples]
    clf: Pipeline = Pipeline(
        [("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
         ("lr", LogisticRegression(max_iter=1000))]
    )
    clf.fit(X, y)
    joblib.dump(clf, MODEL_PATH)
    print(f"Trained on {len(samples)} samples ({len(samples)-len(BOOTSTRAP)} from DB) -> {MODEL_PATH}")
    print("Classes:", sorted(set(y)))


if __name__ == "__main__":
    main()
