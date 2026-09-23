# Run Intelligent IT Support on Windows or Linux

The recommended setup on both operating systems is Docker Compose. It starts
PostgreSQL, applies Alembic migrations, seeds development data, and runs the
FastAPI and React services together.

## Quick start with Docker (recommended)

### Prerequisites

- Git
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows
  or Docker Engine + the Compose plugin on Linux
- At least 4 GB of available RAM for Docker

### Windows — PowerShell

```powershell
git clone https://github.com/madhielyousfi/intelligent-it-support.git
cd intelligent-it-support
docker compose up --build
```

Docker Desktop must be running before the final command. Open
<http://localhost:8080> after the containers finish starting.

### Linux — Terminal

```bash
git clone https://github.com/madhielyousfi/intelligent-it-support.git
cd intelligent-it-support
./run.sh
```

`run.sh` starts Docker Compose, waits for FastAPI, and opens a browser when one
is available. Alternatively, use the same command as Windows:

```bash
docker compose up --build
```

## URLs and development accounts

| Service | URL |
| --- | --- |
| React application | <http://localhost:8080> |
| FastAPI Swagger documentation | <http://localhost:8000/docs> |
| FastAPI health check | <http://localhost:8000/health> |

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@example.com` | `admin123` |
| Manager | `manager@example.com` | `manager123` |
| Technician | `tech@example.com` | `tech123` |
| Customer | `customer@example.com` | `customer123` |

These are development-only accounts. Change passwords and `SECRET_KEY` before
any public deployment.

## Daily Docker commands

```bash
# Start in the background
docker compose up -d

# Follow logs
docker compose logs -f

# Stop services but keep database and AI-model data
docker compose down

# Retrain the ticket-category model
docker compose exec backend python /app/ai/train.py

# Refresh reporting CSV files in data/
docker compose exec backend python /app/etl/run.py
```

To remove all local Docker data and start over, run the following destructive
command. This deletes the local PostgreSQL database and trained model volume:

```bash
docker compose down -v
```

## Native development (optional)

Use this only if you want to run services without Docker. Install Python 3.12,
Node.js 20+, PostgreSQL 16+, and Tesseract OCR first. Create a PostgreSQL
database/user that match your environment, then copy
[`backend/.env.example`](../backend/.env.example). Update `DATABASE_URL` in
`.env` to match local PostgreSQL—its usual host port is `5432`; `5433` is the
Docker host port used by this repository.

### Linux

```bash
cd backend
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>.

### Windows — PowerShell

```powershell
cd backend
Copy-Item .env.example .env
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload
```

In another PowerShell window:

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. If PowerShell blocks virtual-environment
activation, run `Set-ExecutionPolicy -Scope Process Bypass` once in that
terminal and retry activation.

## Troubleshooting

- **Port 8080, 8000, or 5433 is already in use:** stop the process using that
  port, or stop a previous Docker stack with `docker compose down`.
- **Docker command cannot connect:** open Docker Desktop on Windows, or start
  the Docker service on Linux.
- **Frontend starts but API calls fail:** confirm `http://localhost:8000/health`
  returns `{"status":"ok"}` and inspect `docker compose logs backend`.
- **Fresh schema required:** use `docker compose down -v`, then run
  `docker compose up --build` again. This removes local data.
