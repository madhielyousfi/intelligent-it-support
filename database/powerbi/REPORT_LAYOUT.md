# Intelligent IT Support — Power BI report layout

Use a single **Support Operations** report page for the first dashboard.

```text
+----------------+----------------+----------------+----------------+
| Total Tickets  | Open Tickets   | Closed Tickets | Critical Open  |
+----------------+----------------+----------------+----------------+
| Ticket volume by day            | Tickets by status                   |
+---------------------------------+-------------------------------------+
| Tickets by category             | Average resolution hours by category|
+---------------------------------+-------------------------------------+
| Recent/open ticket table (ticket, title, priority, status, owner)   |
+---------------------------------------------------------------------+
```

## Data model

`FactTickets` is the detail table. The other imported views are already
aggregated and can be used directly in visuals; no relationships are required
for the first report page.

## Visual mapping

| Visual | Source | Fields |
| --- | --- | --- |
| KPI cards | `FactTickets` | DAX: Total Tickets, Open Tickets, Closed Tickets, Critical Tickets |
| Daily volume line chart | `DailyTicketVolume` | Axis: day; Values: n |
| Status donut/bar | `TicketsByStatus` | Legend: status; Values: n |
| Category bar | `TicketsByCategory` | Axis: category; Values: n |
| Resolution-time bar | `AvgHoursToResolve` | Axis: category; Values: avg_hours |
| Open-ticket table | `FactTickets` | ticket_id, title, priority, status, technician, created_at |

Add slicers for `FactTickets[created_date]`, `FactTickets[priority]`,
`FactTickets[status]`, `FactTickets[category]`, and `FactTickets[technician]`.

## Refresh choices

- **Import**: refresh from PostgreSQL on demand or through the Power BI gateway.
- **DirectQuery**: live report against the reporting views; use when the
  database is reachable from the Power BI machine or gateway.
- **CSV import**: choose the six files in `data/` if database connectivity is
  unavailable. Run `docker compose exec backend python /app/etl/run.py` first.

Keep PostgreSQL credentials in Power BI’s data-source settings, never inside a
Power Query script or version control.
