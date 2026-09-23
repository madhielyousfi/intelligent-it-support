"""Export PostgreSQL reporting views to atomic CSV snapshots for Power BI.

Uses DATABASE_URL from the environment first, then backend/.env for native
development. Run from the repository root: ``python etl/run.py``.
"""

import argparse
import csv
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

QUERIES = {
    "fact_tickets": "SELECT * FROM v_fact_tickets ORDER BY ticket_id",
    "by_status": "SELECT * FROM v_tickets_by_status ORDER BY n DESC",
    "by_category": "SELECT * FROM v_tickets_by_category ORDER BY n DESC",
    "avg_hours_to_resolve": "SELECT * FROM v_avg_hours_to_resolve ORDER BY category",
    "by_priority": "SELECT * FROM v_tickets_by_priority ORDER BY n DESC",
    "daily_ticket_volume": "SELECT * FROM v_ticket_daily_volume ORDER BY day",
}


def _db_url() -> str:
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env = ROOT / "backend" / ".env"
    if not env.exists():
        raise RuntimeError("Set DATABASE_URL or create backend/.env before running ETL")
    for line in env.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip()
    raise RuntimeError("DATABASE_URL not found in environment or backend/.env")


def export(data_dir: Path) -> dict[str, int]:
    from sqlalchemy import create_engine, text

    data_dir.mkdir(parents=True, exist_ok=True)
    engine = create_engine(_db_url())
    counts: dict[str, int] = {}
    with engine.connect() as conn:
        for name, sql in QUERIES.items():
            rows = conn.execute(text(sql))
            path = data_dir / f"{name}.csv"
            # Consumers never see a half-written report if the export stops.
            with tempfile.NamedTemporaryFile("w", newline="", dir=data_dir, delete=False) as f:
                temporary_path = Path(f.name)
                w = csv.writer(f, lineterminator="\n")
                w.writerow(rows.keys())
                data = rows.fetchall()
                w.writerows(data)
            os.replace(temporary_path, path)
            # Docker runs as root by default; make host-mounted reports usable
            # by the local user and desktop BI tools as well.
            os.chmod(path, 0o644)
            counts[name] = len(data)
            print(f"{path.name}: {len(data)} rows")
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Export ITSM reporting CSV snapshots")
    parser.add_argument("--output-dir", type=Path, default=Path(os.environ.get("REPORT_DATA_DIR", ROOT / "data")))
    args = parser.parse_args()
    export(args.output_dir)


if __name__ == "__main__":
    main()
