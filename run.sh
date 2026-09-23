#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'
OPEN_BROWSER=true
BUILD=true

usage() {
    cat <<'EOF'
Usage: ./run.sh [--no-browser] [--no-build]

Starts PostgreSQL, FastAPI, and React with Docker Compose.
  --no-browser  Do not open the application automatically.
  --no-build    Start existing images without rebuilding them.
EOF
}

for arg in "$@"; do
    case "$arg" in
        --no-browser) OPEN_BROWSER=false ;;
        --no-build) BUILD=false ;;
        -h|--help) usage; exit 0 ;;
        *) echo -e "${RED}Unknown option: $arg${NC}"; usage; exit 2 ;;
    esac
done

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Intelligent IT Support — Startup Script${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 1. Check Docker ──────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
    echo -e "${RED}✗ Docker not found. Install it: https://docs.docker.com/get-docker/${NC}"
    exit 1
fi
if ! docker info &>/dev/null 2>&1; then
    echo -e "${RED}✗ Docker daemon not running. Start Docker first.${NC}"
    exit 1
fi
if ! docker compose version &>/dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose v2 is required.${NC}"
    exit 1
fi
if ! command -v curl &>/dev/null; then
    echo -e "${RED}✗ curl is required for the startup health check.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker ready${NC}"

# ── 2. Build & start containers ─────────────────────────────────
echo -e "${CYAN}▶ Building and starting containers...${NC}"
if [[ "$BUILD" == true ]]; then
    docker compose up -d --build
else
    docker compose up -d
fi

# ── 3. Wait for health ──────────────────────────────────────────
echo -e "${CYAN}▶ Waiting for services...${NC}"
healthy=false
for i in $(seq 1 40); do
    if curl -sf http://localhost:8000/health &>/dev/null; then
        healthy=true
        break
    fi
    sleep 3
done
if [[ "$healthy" != true ]]; then
    echo -e "${RED}✗ FastAPI did not become healthy within 120 seconds.${NC}"
    echo -e "${CYAN}Recent backend logs:${NC}"
    docker compose logs --tail 40 backend || true
    exit 1
fi
echo -e "${GREEN}✓ PostgreSQL, FastAPI, and React are running${NC}"

# ── 4. Print info ───────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  ✓ ITSM is running!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  Frontend:   ${CYAN}http://localhost:8080${NC}"
echo -e "  API Docs:   ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  Health:     ${CYAN}http://localhost:8000/health${NC}"
echo ""
echo -e "  Login credentials:"
echo -e "    Admin:      ${CYAN}admin@example.com${NC} / ${CYAN}admin123${NC}"
echo -e "    Technician: ${CYAN}tech@example.com${NC} / ${CYAN}tech123${NC}"
echo -e "    Manager:    ${CYAN}manager@example.com${NC} / ${CYAN}manager123${NC}"
echo -e "    Customer:   ${CYAN}customer@example.com${NC} / ${CYAN}customer123${NC}"
echo ""
echo -e "  Phase 2 operations:"
echo -e "    Retrain AI: ${CYAN}docker compose exec backend python /app/ai/train.py${NC}"
echo -e "    Export ETL: ${CYAN}docker compose exec backend python /app/etl/run.py${NC}"
echo ""

# ── 5. Open browser ─────────────────────────────────────────────
if [[ "$OPEN_BROWSER" == true ]] && command -v brave &>/dev/null; then
    nohup brave http://localhost:8080 >/dev/null 2>&1 &
    echo -e "${GREEN}✓ Opened Brave browser${NC}"
elif [[ "$OPEN_BROWSER" == true ]] && command -v brave-browser &>/dev/null; then
    nohup brave-browser http://localhost:8080 >/dev/null 2>&1 &
    echo -e "${GREEN}✓ Opened Brave browser${NC}"
elif [[ "$OPEN_BROWSER" == true ]] && command -v xdg-open &>/dev/null; then
    nohup xdg-open http://localhost:8080 >/dev/null 2>&1
    echo -e "${GREEN}✓ Opened default browser${NC}"
else
    echo -e "  Open ${CYAN}http://localhost:8080${NC} in your browser"
fi

echo ""
echo -e "  To stop:  ${CYAN}docker compose down${NC}"
echo -e "  To logs:  ${CYAN}docker compose logs -f${NC}"
echo ""
