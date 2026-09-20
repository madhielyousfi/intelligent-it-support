import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

const STATUSES = ["", "NEW", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
const PRIORITY_COLORS = { URGENT: "#c0392b", HIGH: "#e67e22", MEDIUM: "var(--ink)", LOW: "var(--text-faint)" };

export default function Tickets() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const load = async (s) => {
    try { setItems(await api.listTickets(s || undefined)); }
    catch (e) { setError(String(e.message).slice(0, 300)); }
  };

  useEffect(() => { load(status); }, [status]);

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3>Tickets</h3>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>{items.length} ticket{items.length !== 1 ? "s" : ""}</p>
        </div>
        <Link to="/tickets/new" className="btn-primary" style={{ textDecoration: "none" }}>New ticket</Link>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={status === s ? "badge badge-ink" : "badge badge-soft"}
            style={{ cursor: "pointer" }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600, color: "var(--text-faint)" }}>{t.id}</td>
                <td><Link to={`/tickets/${t.id}`}>{t.title}</Link></td>
                <td><span className="badge badge-soft">{t.status}</span></td>
                <td style={{ color: PRIORITY_COLORS[t.priority] || "var(--ink)", fontWeight: 600, fontSize: 14 }}>{t.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="card-soft" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-muted)" }}>No tickets match this filter.</p>
        </div>
      )}
    </div>
  );
}
