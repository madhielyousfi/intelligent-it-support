# Intelligent IT Support (ITSM) — full build complete

Login → customer → device → ticket → assign → status → resolve → dashboard,
plus AI classifier, knowledge base, OCR, ETL/data mart, and Docker deployment.

## Architecture

```text
React (frontend/) → FastAPI (backend/app) → PostgreSQL 16
                    ├─ ai/ticket_classifier.pkl (TF-IDF + LogReg, retrain: python ai/train.py)
                    ├─ ai/ocr.py via POST /ocr/extract (tesseract)
                    └─ database/mart.sql views ──etl/run.py──▶ data/*.csv ──▶ Power BI
```

## Run — native dev (DB-only container)

```bash
docker start itsm-postgres || docker run -d --name itsm-postgres \
  -e POSTGRES_USER=itsm -e POSTGRES_PASSWORD=itsm_dev_password -e POSTGRES_DB=itsm_db \
  -p 5433:5432 postgres:16
pip install -r backend/requirements.txt
cd backend && python -m app.init_db && python -m app.seed
uvicorn app.main:app          # :8000, GET /health → {"status":"ok"}
cd ../frontend && npm install && npm run dev   # :5173
```

Seeds: `admin@itsm.local/admin123`, `tech@itsm.local/tech123`, `manager@itsm.local/manager123`.

## Run — full stack

```bash
docker compose up -d --build   # frontend :8080, backend :8000, postgres :5433
```

## Sessions delivered

| # | Scope | Key checks |
|---|---|---|
| 1 | Scaffold, PG, health, 7 tables, JWT | `/health → ok`, login works |
| 2 | Customers/devices/tickets slice | device needs customer; ticket `NEW` + history |
| 3 | Assign/status/resolve state machine | invalid jumps `400`; full `NEW→CLOSED` flow |
| 4 | Dashboard + M1 E2E | live counts update after close |
| 6 | Classifier (`ai/train.py` → pkl → `ai_category`/`ai_confidence` + `PATCH …/recategorize`) | uncategorized ticket gets suggestion |
| 7 | Articles + similar + suggestions on ticket page | same-category results |
| 8 | `POST /ocr/extract` + screenshot hook on ticket form | text extracted from PNG |
| 9 | `database/mart.sql` + `python etl/run.py` → `data/*.csv` + Power BI guide | 4 CSVs exported |
| 10 | Dockerfiles + compose + wait-for-db | AI + OCR verified inside containers |

State machine: `NEW → ASSIGNED → IN_PROGRESS → WAITING_CUSTOMER | RESOLVED → CLOSED`
(`RESOLVED → CLOSED` via status; resolve only from `IN_PROGRESS`/`WAITING_CUSTOMER`).
Retrain the classifier as ticket volume grows: `python ai/train.py` (DB tickets feed back in).
