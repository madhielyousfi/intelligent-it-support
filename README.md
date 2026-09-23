# Intelligent IT Support

[![Open in Google Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/madhielyousfi/intelligent-it-support/blob/master/colab/itsm_quickstart.ipynb?forceReload=true)

A FastAPI, React, and PostgreSQL IT Service Management (ITSM) application.
It includes the completed transactional workflow and Phase 2 support tools:
AI category suggestions, knowledge-base recommendations, screenshot OCR, ETL
reporting exports, and a Power BI handoff kit.

## Project status

The project is functionally complete through Phase 2. Before a public
production deployment, rotate development credentials, set a strong
`SECRET_KEY`, configure HTTPS/CORS for the deployment domain, and arrange
PostgreSQL backups and scheduled ETL/model-retraining jobs.

## Architecture

```text
React UI → FastAPI (JWT + role authorization) → PostgreSQL
                                      └── Alembic migrations
```

The repository also retains its AI, OCR, ETL, Power BI, and Docker components.
`ai_category` and `ai_confidence` remain nullable whenever no trained model is
available.

## Technology

- React 18 + Vite
- FastAPI + SQLAlchemy + Pydantic
- PostgreSQL 16 + Alembic
- JWT bearer authentication + bcrypt password hashes
- Pytest + HTTPX

## Roles and permissions

| Role | Access |
| --- | --- |
| Customer | Own profile/devices/tickets; may create tickets only for its linked customer record |
| Technician | Only assigned tickets and their related customers/devices; may progress and resolve them |
| Manager | All tickets/customers/devices/categories, assignment, and global dashboard |
| Admin | Full management of users, customers, devices, categories, tickets, and dashboard |

The backend, not the frontend, enforces these rules.

## Ticket workflow

```text
NEW → ASSIGNED → IN_PROGRESS → WAITING_CUSTOMER → IN_PROGRESS → RESOLVED → CLOSED
```

`IN_PROGRESS → RESOLVED` and `WAITING_CUSTOMER → RESOLVED` are also valid.
Invalid transitions are rejected by the API. Every ticket action creates a
`ticket_history` record.

## Configuration

Copy the backend example environment file and set a secure secret outside local
development:

```bash
cd backend
cp .env.example .env
```

Required variables:

```env
DATABASE_URL=postgresql+psycopg://itsm:itsm_dev_password@localhost:5433/itsm_db
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## Native development

Start PostgreSQL (the Compose database service is convenient for local use),
then install and run the backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the UI at `http://localhost:5173`, and Swagger at
`http://localhost:8000/docs`.

## Google Colab demo

Use the **Open in Google Colab** button above to run a temporary React,
FastAPI, PostgreSQL, AI-classifier, and OCR demo directly from GitHub. The
notebook runs Alembic migrations, seeds the current development data, trains
the classifier, and embeds the full login UI through Colab's port proxy.

Colab is intended for demonstrations and learning only: its data is temporary
and it is not a deployment environment.

## Docker

Docker starts PostgreSQL, applies the Alembic migration, seeds development data,
and starts the API and frontend:

```bash
docker compose build
docker compose up
```

Or use the helper script, which builds the stack, waits for the FastAPI health
endpoint, and opens the browser:

```bash
./run.sh
# Useful for servers or repeated starts:
./run.sh --no-browser --no-build
```

Frontend: `http://localhost:8080`
API documentation: `http://localhost:8000/docs`

Development accounts:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Manager | `manager@example.com` | `manager123` |
| Technician | `tech@example.com` | `tech123` |
| Customer | `customer@example.com` | `customer123` |

The seed command creates eight default categories, three customers, five
devices, eight internally consistent sample tickets, and starter
knowledge-base articles.

## Day-to-day operations

```bash
# Follow application logs
docker compose logs -f

# Retrain the AI model from bootstrap + categorized ticket data
docker compose exec backend python /app/ai/train.py

# Refresh Power BI CSV snapshots from reporting views
docker compose exec backend python /app/etl/run.py

# Stop the local stack (keeps Docker volumes/data)
docker compose down
```

## Tests

```bash
cd backend
pytest -q
```

The suite covers authentication, user/customer/device/category management,
ticket validation and filtering, authorization boundaries, assignment history,
workflow state transitions, resolution/closure timestamps, and live dashboard
counts.

For a running API connected to PostgreSQL, execute the HTTP acceptance flow:

```bash
cd backend
ITSM_BASE_URL=http://127.0.0.1:8000 python tests/e2e_http.py
```

## Milestone 1 acceptance flow

1. Sign in as Admin and create a technician, customer, and device.
2. Create a category-linked ticket. It starts as `NEW`.
3. Assign the technician (`ASSIGNED`).
4. Sign in as that technician and verify only assigned tickets are listed.
5. Move the ticket through `IN_PROGRESS`, `WAITING_CUSTOMER`, `IN_PROGRESS`,
   `RESOLVED`, and `CLOSED`.
6. Verify ticket history and dashboard metrics reflect every action.

## Phase 2: AI category suggestions

The ticket form can suggest a category from its title and description. The
suggestion never replaces the user-selected category. On ticket creation, the
prediction and confidence are stored in the nullable AI fields for later review.

Train or retrain the local model after collecting better ticket data:

```bash
# Native development, from the repository root
python ai/train.py

# Docker; the trained model is retained in the itsm-ai-models volume
docker compose exec backend python /app/ai/train.py
```

The model is automatically detected after training; restarting the API is not
needed.

Resolved ticket fixes are stored as reusable solutions. Ticket details use
same-category solutions, similar tickets, and knowledge-base articles as
suggestions. Managers and administrators can manage articles at
`/knowledge-base`; all signed-in roles can read them.

Ticket creation also accepts PNG, JPEG, and WebP screenshots. OCR extracts
text locally and appends it to the draft description; uploads are limited to
5 MB and 16 million pixels.

## ETL reporting and Power BI

Alembic creates reporting views for ticket facts, status/category/priority
counts, resolution time, and daily ticket volume. Export a consistent CSV
snapshot after the stack is running:

```bash
docker compose exec backend python /app/etl/run.py
```

The CSV files are written to `data/` for Power BI import. For a direct
PostgreSQL connection and suggested visuals, see
[`database/powerbi_README.md`](database/powerbi_README.md).

Power BI handoff assets are ready in `database/powerbi/`: paste
`itsm_powerquery.m` into Power Query, create measures from `itsm_measures.dax`,
and follow `REPORT_LAYOUT.md`. This keeps database credentials and generated
`.pbix` files outside version control.
