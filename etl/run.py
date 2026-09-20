"""Nightly-style ETL snapshot (Session 9): Postgres views -> CSVs in data/ for Power BI.

Usage (from repo root):  /tmp/itsm-venv/bin/python etl/run.py
Reads DATABASE_URL from backend/.env.
"""

import csv
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

QUERIES = {
    "fact_tickets": "SELECT * FROM v_fact_tickets ORDER BY ticket_id",
    "by_status": "SELECT * FROM v_tickets_by_status ORDER BY n DESC",
    "by_category": "SELECT * FROM v_tickets_by_category ORDER BY n DESC",
    "avg_hours_to_resolve": "SELECT * FROM v_avg_hours_to_resolve ORDER BY category",
}


def _db_url() -> str:
    env = ROOT / "backend" / ".env"
    for line in env.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("DATABASE_URL not found in backend/.env")


def main() -> None:
    from sqlalchemy import create_engine, text

    data_dir = ROOT / "data"
    data_dir.mkdir(exist_ok=True)
    engine = create_engine(_db_url())
    with engine.connect() as conn:
        for name, sql in QUERIES.items():
            rows = conn.execute(text(sql))
            path = data_dir / f"{name}.csv"
            with open(path, "w", newline="") as f:
                w = csv.writer(f)
                w.writerow(rows.keys())
                data = rows.fetchall()
                w.writerows(data)
            print(f"{path.name}: {len(data)} rows")


if __name__ == "__main__":
    main()
