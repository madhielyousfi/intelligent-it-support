-- Data mart views (Session 9). Apply: psql $DATABASE_URL -f database/mart.sql
-- Power BI can connect to these views directly (Get Data -> PostgreSQL).

CREATE OR REPLACE VIEW v_fact_tickets AS
SELECT
    t.id            AS ticket_id,
    t.title,
    t.priority,
    t.status,
    t.ai_category,
    t.ai_confidence,
    c.name          AS customer,
    c.company       AS company,
    CONCAT_WS(' ', d.manufacturer, d.model) AS device,
    cat.name        AS category,
    u.full_name     AS technician,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at,
    EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600.0 AS hours_to_resolve
FROM tickets t
LEFT JOIN customers  c   ON c.id = t.customer_id
LEFT JOIN devices    d   ON d.id = t.device_id
LEFT JOIN categories cat ON cat.id = t.category_id
LEFT JOIN users      u   ON u.id = t.technician_id;

CREATE OR REPLACE VIEW v_tickets_by_status AS
SELECT status, COUNT(*) AS n FROM tickets GROUP BY status;

CREATE OR REPLACE VIEW v_tickets_by_category AS
SELECT COALESCE(cat.name, '(none)') AS category, COUNT(*) AS n
FROM tickets t LEFT JOIN categories cat ON cat.id = t.category_id
GROUP BY cat.name;

CREATE OR REPLACE VIEW v_avg_hours_to_resolve AS
SELECT COALESCE(cat.name, '(none)') AS category,
       COUNT(*) AS resolved_n,
       ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600.0), 2) AS avg_hours
FROM tickets t LEFT JOIN categories cat ON cat.id = t.category_id
WHERE t.resolved_at IS NOT NULL
GROUP BY cat.name;

CREATE OR REPLACE VIEW v_tickets_by_priority AS
SELECT priority, COUNT(*) AS n FROM tickets GROUP BY priority;

CREATE OR REPLACE VIEW v_ticket_daily_volume AS
SELECT DATE(created_at) AS day, COUNT(*) AS n
FROM tickets
GROUP BY DATE(created_at)
ORDER BY day;
