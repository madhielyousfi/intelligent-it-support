/*
Power Query starter for Intelligent IT Support.

1. In Power BI Desktop: Transform data -> New source -> Blank query -> Advanced editor.
2. Create two text parameters before using this query:
     pServer   = "localhost:5433"
     pDatabase = "itsm_db"
3. Paste a section into a separate blank query and name it as indicated.
4. At the credential prompt choose PostgreSQL database authentication. Do not
   place passwords in this file.

Use Import mode for a refreshable report, or DirectQuery when the report must
always query the PostgreSQL data mart.
*/

// Query name: FactTickets
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    FactTickets = Source{[Schema="public", Item="v_fact_tickets"]}[Data],
    Typed = Table.TransformColumnTypes(FactTickets, {
        {"ticket_id", Int64.Type}, {"title", type text}, {"priority", type text},
        {"status", type text}, {"ai_category", type text}, {"ai_confidence", type number},
        {"customer", type text}, {"company", type text}, {"device", type text},
        {"category", type text}, {"technician", type text}, {"created_at", type datetimezone},
        {"updated_at", type datetimezone}, {"resolved_at", type datetimezone},
        {"closed_at", type datetimezone}, {"hours_to_resolve", type number}
    }),
    WithCreatedDate = Table.AddColumn(Typed, "created_date", each Date.From([created_at]), type date)
in
    WithCreatedDate

// Query name: TicketsByStatus
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    TicketsByStatus = Source{[Schema="public", Item="v_tickets_by_status"]}[Data],
    Typed = Table.TransformColumnTypes(TicketsByStatus, {{"status", type text}, {"n", Int64.Type}})
in
    Typed

// Query name: TicketsByCategory
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    TicketsByCategory = Source{[Schema="public", Item="v_tickets_by_category"]}[Data],
    Typed = Table.TransformColumnTypes(TicketsByCategory, {{"category", type text}, {"n", Int64.Type}})
in
    Typed

// Query name: AvgHoursToResolve
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    AvgHoursToResolve = Source{[Schema="public", Item="v_avg_hours_to_resolve"]}[Data],
    Typed = Table.TransformColumnTypes(AvgHoursToResolve, {{"category", type text}, {"resolved_n", Int64.Type}, {"avg_hours", type number}})
in
    Typed

// Query name: TicketsByPriority
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    TicketsByPriority = Source{[Schema="public", Item="v_tickets_by_priority"]}[Data],
    Typed = Table.TransformColumnTypes(TicketsByPriority, {{"priority", type text}, {"n", Int64.Type}})
in
    Typed

// Query name: DailyTicketVolume
let
    Source = PostgreSQL.Database(pServer, pDatabase),
    DailyTicketVolume = Source{[Schema="public", Item="v_ticket_daily_volume"]}[Data],
    Typed = Table.TransformColumnTypes(DailyTicketVolume, {{"day", type date}, {"n", Int64.Type}})
in
    Typed
