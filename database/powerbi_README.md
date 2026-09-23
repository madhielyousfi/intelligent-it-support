# Power BI handoff (Session 9)

The ready-to-paste Power Query scripts, DAX measures, and visual layout are in
[`database/powerbi/`](powerbi/). They are text-based so secrets and generated
Power BI binaries are never committed to the project.

Two connection options:

## Option A — DirectQuery/Live (recommended once data grows)
Power BI Desktop → Get Data → PostgreSQL database:
- Server: `localhost:5433`, Database: `itsm_db`
- Tables/views: `v_fact_tickets`, `v_tickets_by_status`, `v_tickets_by_category`, `v_avg_hours_to_resolve`
  plus `v_tickets_by_priority` and `v_ticket_daily_volume`.

## Option B — CSV import (works without DB access)
Import the snapshots produced by `python etl/run.py`:
- `data/fact_tickets.csv`
- `data/by_status.csv`
- `data/by_category.csv`
- `data/avg_hours_to_resolve.csv`
- `data/by_priority.csv`
- `data/daily_ticket_volume.csv`

## Suggested visuals

Use [REPORT_LAYOUT.md](powerbi/REPORT_LAYOUT.md) for the exact first-page
layout and [itsm_measures.dax](powerbi/itsm_measures.dax) for KPI measures.
