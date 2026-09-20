<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.141-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/scikit--learn-1.9-F7931E?style=flat-square&logo=scikit-learn&logoColor=white" alt="scikit-learn">
  <img src="https://img.shields.io/badge/Docker-24-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
  <a href="https://colab.research.google.com/github/madhielyousfi/intelligent-it-support/blob/master/colab/itsm_quickstart.ipynb"><img src="https://colab.research.google.com/assets/colab-badge.svg" alt="Open in Colab"></a>
</p>

<h1 align="center">Intelligent IT Support</h1>

<p align="center">
  A full-stack ITSM platform with AI ticket classification, OCR, knowledge base, and Power BI data mart.
</p>

---

## Overview

Built as a 10-session incremental build, from empty repo to production-ready Docker deployment.

```
Login → Create customer → Register device → Create ticket → Assign technician
→ Change status → Resolve ticket → Dashboard metrics update
```

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React Frontend (nginx)         :8080                        │
│  Mobbin design system · Inter · stadium-pill · shadow-free   │
├──────────────────────────────────────────────────────────────┤
│  FastAPI Backend                :8000                        │
│  JWT auth · role guards · state machine · CORS               │
│  ├── /auth, /customers, /devices, /tickets, /dashboard      │
│  ├── /articles (knowledge base), /ocr (screenshot extract)  │
│  └── /users/technicians, /categories                        │
├──────────────────────────────────────────────────────────────┤
│  PostgreSQL 16                  :5433                        │
│  8 tables · views → ETL → CSV → Power BI                    │
├──────────────────────────────────────────────────────────────┤
│  AI Layer                                                   │
│  ├── ticket_classifier.pkl (TF-IDF + LogReg, retrainable)   │
│  └── ocr.py (Tesseract, independent service)                │
└──────────────────────────────────────────────────────────────┘
```

## Quick Start

### Option 1 — Google Colab (zero setup)

[![Open in Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/madhielyousfi/intelligent-it-support/blob/master/colab/itsm_quickstart.ipynb)

Runs the full backend + database + AI in a free Colab runtime.

### Option 2 — Docker Compose (recommended)

```bash
git clone https://github.com/madhielyousfi/intelligent-it-support.git
cd intelligent-it-support
docker compose up -d --build
```

| Service  | URL                  | Purpose            |
|----------|----------------------|--------------------|
| Frontend | http://localhost:8080 | React UI           |
| Backend  | http://localhost:8000 | FastAPI + Swagger  |
| Database | localhost:5433       | PostgreSQL 16      |

### Option 3 — Native development

```bash
# Database (Docker only)
docker start itsm-postgres || docker run -d --name itsm-postgres \
  -e POSTGRES_USER=itsm -e POSTGRES_PASSWORD=itsm_dev_password \
  -e POSTGRES_DB=itsm_db -p 5433:5432 postgres:16

# Backend
cd backend
pip install -r requirements.txt
python -m app.init_db && python -m app.seed
uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install && npm run dev
```

## Credentials

| Role       | Email              | Password  | Access                        |
|------------|--------------------|-----------|-------------------------------|
| Admin      | admin@itsm.local   | admin123  | Everything                    |
| Manager    | manager@itsm.local | manager123| Dashboard, customers, tickets |
| Technician | tech@itsm.local    | tech123   | Assigned tickets, status      |

## Features

### Core ITSM
- JWT authentication with role-based access control
- Customer & device management with relational integrity
- Ticket lifecycle with enforced state machine:

```
NEW → ASSIGNED → IN_PROGRESS → WAITING_CUSTOMER | RESOLVED → CLOSED
```

Invalid transitions return `400`. Every action writes to `ticket_history`.

### AI-Powered
- Auto-classification via TF-IDF + LogisticRegression at ticket creation
- Confidence scoring — low-confidence predictions leave fields null
- Manager override via `PATCH /tickets/{id}/recategorize`
- Retrainable: `python ai/train.py` incorporates new labeled tickets

### Knowledge Base
- Articles scoped to categories
- Similar tickets — same-category lookup on ticket detail
- Suggested solutions — past resolutions + articles surfaced automatically

### OCR
- Standalone endpoint: `POST /ocr/extract` for any screenshot
- Ticket integration: file upload on create form appends extracted text

### Data Mart & Power BI
- SQL views: `v_fact_tickets`, `v_tickets_by_status`, `v_tickets_by_category`, `v_avg_hours_to_resolve`
- CSV export: `python etl/run.py` snapshots all views to `data/*.csv`
- Power BI: connect directly to PostgreSQL or import the CSVs

## Project Structure

```
intelligent-it-support/
├── ai/
│   ├── train.py              # Classifier training
│   ├── ocr.py                # Tesseract wrapper
│   └── ticket_classifier.pkl # Trained model
├── backend/
│   ├── app/
│   │   ├── core/             # config, database, security
│   │   ├── models/           # SQLAlchemy: 8 tables
│   │   ├── schemas/          # Pydantic models
│   │   ├── routers/          # FastAPI endpoints (11 modules)
│   │   ├── services/         # Auth deps, classifier
│   │   ├── main.py           # App + CORS
│   │   ├── init_db.py        # create_all
│   │   └── seed.py           # Dev users + categories
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/            # Login, Dashboard, Customers, Tickets
│   │   ├── components/       # Layout (sidebar nav)
│   │   ├── services/         # API client
│   │   └── index.css         # Mobbin design tokens
│   ├── DESIGN.md             # Mobbin reference
│   ├── Dockerfile            # Multi-stage build
│   └── nginx.conf            # API proxy
├── database/
│   ├── mart.sql              # Data mart views
│   └── powerbi_README.md     # Power BI guide
├── etl/
│   └── run.py                # Views → CSV
├── colab/
│   └── itsm_quickstart.ipynb # One-click Colab
├── docker-compose.yml
└── README.md
```

## API Endpoints

| Method | Path                         | Auth          | Description                  |
|--------|------------------------------|---------------|------------------------------|
| GET    | `/health`                    | —             | Health check                 |
| POST   | `/auth/login`                | —             | JWT login (JSON)             |
| POST   | `/auth/token`                | —             | JWT login (OAuth2 form)      |
| GET    | `/auth/me`                   | Bearer        | Current user profile         |
| POST   | `/customers`                 | Admin/Manager | Create customer              |
| GET    | `/customers`                 | Any           | List customers               |
| GET    | `/customers/{id}`            | Any           | Customer details             |
| POST   | `/devices`                   | Admin/Manager | Register device              |
| GET    | `/devices`                   | Any           | List devices                 |
| GET    | `/devices/{id}`              | Any           | Device details               |
| POST   | `/tickets`                   | Any           | Create ticket (auto AI)      |
| GET    | `/tickets`                   | Any           | List tickets (status filter) |
| GET    | `/tickets/{id}`              | Any           | Ticket detail + history      |
| PATCH  | `/tickets/{id}/assign`       | Admin/Manager | Assign technician            |
| PATCH  | `/tickets/{id}/status`       | Tech/Admin    | Change status (enforced)     |
| PATCH  | `/tickets/{id}/resolve`      | Tech/Admin    | Resolve with text            |
| PATCH  | `/tickets/{id}/recategorize` | Admin/Manager | Override AI category         |
| GET    | `/tickets/{id}/similar`      | Any           | Similar tickets              |
| GET    | `/tickets/{id}/suggestions`  | Any           | Resolutions + articles       |
| GET    | `/users/technicians`         | Admin/Manager | List technicians             |
| GET    | `/categories`                | Any           | List categories              |
| POST   | `/articles`                  | Admin/Manager | Create KB article            |
| GET    | `/articles`                  | Any           | List articles                |
| POST   | `/ocr/extract`               | Any           | OCR image to text            |
| GET    | `/dashboard/stats`           | Admin/Manager | Total/open/resolved/closed   |

## State Machine

```
         ┌──────────┐
         │   NEW    │
         └────┬─────┘
              │ assign
         ┌────▼──────┐
         │ ASSIGNED  │
         └────┬──────┘
              │ status
         ┌────▼───────────┐
         │  IN_PROGRESS   │◄─────────────┐
         └──┬─────────┬───┘              │
            │         │ status            │ status
            │ resolve │ (WAITING)         │ (IN_PROGRESS)
            │         └────┐              │
         ┌──▼──────────┐   │         ┌────┘
         │  RESOLVED   │   └─────────┘
         └──────┬──────┘
                │ status
         ┌──────▼──────┐
         │   CLOSED    │
         └─────────────┘
```

## Retrain the Classifier

```bash
python ai/train.py
# 25 bootstrap samples + all labeled tickets from Postgres → ticket_classifier.pkl
```

## Tech Stack

| Layer    | Technology                                       |
|----------|--------------------------------------------------|
| Frontend | React 18, React Router 6, Vite 5, Mobbin design |
| Backend  | FastAPI 0.141, SQLAlchemy 2.0, Pydantic 2.13     |
| Auth     | JWT (python-jose), bcrypt, OAuth2 bearer         |
| Database | PostgreSQL 16, Alembic migrations                |
| AI       | scikit-learn 1.9 (TF-IDF + LogReg), joblib       |
| OCR      | Tesseract, pytesseract, Pillow                   |
| ETL      | SQL views → Python CSV → Power BI                |
| Deploy   | Docker Compose, nginx reverse proxy              |

## License

MIT
