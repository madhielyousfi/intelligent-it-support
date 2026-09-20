#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

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
echo -e "${GREEN}✓ Docker ready${NC}"

# ── 2. Build & start containers ─────────────────────────────────
echo -e "${CYAN}▶ Building and starting containers...${NC}"
docker compose up -d --build 2>&1 | tail -5

# ── 3. Wait for health ──────────────────────────────────────────
echo -e "${CYAN}▶ Waiting for services...${NC}"
for i in $(seq 1 40); do
    if curl -sf http://localhost:8080/health &>/dev/null; then
        echo -e "${GREEN}✓ All services healthy${NC}"
        break
    fi
    sleep 3
done

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
echo -e "    Admin:      ${CYAN}admin@itsm.local${NC} / ${CYAN}admin123${NC}"
echo -e "    Technician: ${CYAN}tech@itsm.local${NC} / ${CYAN}tech123${NC}"
echo -e "    Manager:    ${CYAN}manager@itsm.local${NC} / ${CYAN}manager123${NC}"
echo ""

# ── 5. Open browser ─────────────────────────────────────────────
if command -v brave &>/dev/null; then
    nohup brave http://localhost:8080 >/dev/null 2>&1 &
    echo -e "${GREEN}✓ Opened Brave browser${NC}"
elif command -v xdg-open &>/dev/null; then
    nohup xdg-open http://localhost:8080 >/dev/null 2>&1
    echo -e "${GREEN}✓ Opened default browser${NC}"
else
    echo -e "  Open ${CYAN}http://localhost:8080${NC} in your browser"
fi

echo ""
echo -e "  To stop:  ${CYAN}docker compose down${NC}"
echo -e "  To logs:  ${CYAN}docker compose logs -f${NC}"
echo ""
