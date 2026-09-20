# Power BI handoff (Session 9)

Two connection options:

## Option A — DirectQuery/Live (recommended once data grows)
Power BI Desktop → Get Data → PostgreSQL database:
- Server: `localhost:5433`, Database: `itsm_db`
- Tables/views: `v_fact_tickets`, `v_tickets_by_status`, `v_tickets_by_category`, `v_avg_hours_to_resolve`

## Option B — CSV import (works without DB access)
Import the snapshots produced by `python etl/run.py`:
- `data/fact_tickets.csv`
- `data/by_status.csv`
- `data/by_category.csv`
- `data/avg_hours_to_resolve.csv`

## Suggested visuals
1. KPI cards: Total tickets, Open, Resolved (from `by_status`)
2. Bar chart: tickets by category (`by_category`)
3. Line/column: avg hours to resolve by category (`avg_hours_to_resolve`)
4. Table: `fact_tickets` filtered to open statuses, sorted newest first
