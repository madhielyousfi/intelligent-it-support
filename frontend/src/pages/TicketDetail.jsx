import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api.js";

const NEXT = {
  NEW: [],
  ASSIGNED: ["IN_PROGRESS"],
  IN_PROGRESS: ["WAITING_CUSTOMER", "RESOLVED"],
  WAITING_CUSTOMER: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

const STATUS_LABELS = {
  NEW: "New",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  WAITING_CUSTOMER: "Waiting",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default function TicketDetail() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [techId, setTechId] = useState("");
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState("");
  const [me, setMe] = useState(null);
  const [sugg, setSugg] = useState(null);

  const load = () => {
    api.getTicket(id).then(setTicket).catch((e) => setError(String(e.message).slice(0, 300)));
    api.suggestions(id).then(setSugg).catch(() => {});
  };

  useEffect(() => {
    load();
    api.me().then(setMe).catch(() => {});
    api.listTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
  }, [id]);

  const run = async (fn) => {
    setError("");
    try { setTicket(await fn()); }
    catch (e) { setError(String(e.message).slice(0, 300)); }
  };

  const canAssign = me && (me.role === "admin" || me.role === "manager");
  const canWork = me && (me.role === "admin" || me.role === "manager" || (me.role === "technician" && ticket.technician_id === me.id));

  if (error && !ticket) return <p className="error-msg">{error}</p>;
  if (!ticket) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const next = NEXT[ticket.status] || [];
  const showResolve = next.includes("RESOLVED");
  const statusButtons = next.filter((s) => s !== "RESOLVED");

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 8 }}>
        <Link to="/tickets" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Tickets</Link>
        <span style={{ color: "var(--text-faint)", margin: "0 8px" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-faint)" }}>#{ticket.id}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3 style={{ marginBottom: 8 }}>{ticket.title}</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-ink">{STATUS_LABELS[ticket.status] || ticket.status}</span>
            <span className="badge badge-soft">{ticket.priority}</span>
          </div>
        </div>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div className="card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Description</p>
          <p>{ticket.description}</p>
        </div>
        <div className="card">
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Details</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Customer</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.customer_name}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Device</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.device_name || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Category</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.category_name || "—"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Technician</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.technician_name || "Unassigned"}</span>
            </div>
            {ticket.ai_category && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>AI suggestion</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{ticket.ai_category} ({Math.round(ticket.ai_confidence * 100)}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {ticket.resolution && (
        <div className="card" style={{ marginBottom: 32, borderLeft: "3px solid var(--ink)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>Resolution</p>
          <p>{ticket.resolution}</p>
        </div>
      )}

      {canAssign && (ticket.status === "NEW" || ticket.status === "ASSIGNED") && technicians.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>Assign technician</p>
          <div style={{ display: "flex", gap: 12 }}>
            <select value={techId} onChange={(e) => setTechId(e.target.value)} style={{ flex: 1 }}>
              <option value="">Select technician</option>
              {technicians.map((t) => <option key={t.id} value={t.id}>{t.full_name} ({t.email})</option>)}
            </select>
            <button disabled={!techId} className="btn-primary" onClick={() => run(() => api.assignTicket(ticket.id, Number(techId)))}>Assign</button>
          </div>
        </div>
      )}

      {canWork && statusButtons.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          {statusButtons.map((s) => (
            <button key={s} className="btn-outline" onClick={() => run(() => api.changeStatus(ticket.id, s))}>
              {STATUS_LABELS[s] || s}
            </button>
          ))}
        </div>
      )}

      {canWork && showResolve && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12 }}>Resolve ticket</p>
          <form onSubmit={(e) => { e.preventDefault(); run(() => api.resolveTicket(ticket.id, resolution)); }} style={{ display: "flex", gap: 12 }}>
            <input placeholder="Describe the resolution…" value={resolution} onChange={(e) => setResolution(e.target.value)} required style={{ flex: 1 }} />
            <button type="submit" className="btn-primary">Resolve</button>
          </form>
        </div>
      )}

      <h5 style={{ marginBottom: 16 }}>History</h5>
      <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
        {(ticket.history || []).map((h, i) => (
          <div key={h.id} style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ink)", marginTop: 6, flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, fontSize: 14 }}>{h.action}</p>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{h.old_value || "—"} → {h.new_value || "—"}{h.note && ` · ${h.note}`}</p>
            </div>
          </div>
        ))}
      </div>

      {sugg && ((sugg.similar || []).length > 0 || (sugg.articles || []).length > 0) && (
        <div className="card" style={{ borderTop: "2px solid var(--ink)" }}>
          <h5 style={{ marginBottom: 16 }}>Suggested solutions</h5>
          {(sugg.resolutions || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Past resolutions</p>
              {sugg.resolutions.map((r, i) => (
                <div key={i} className="card-soft" style={{ marginBottom: 8, padding: 16 }}>
                  <p style={{ fontSize: 14 }}>{r}</p>
                </div>
              ))}
            </div>
          )}
          {(sugg.similar || []).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Similar tickets</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {sugg.similar.map((t) => (
                  <Link key={t.id} to={`/tickets/${t.id}`} style={{ padding: "10px 0", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", textDecoration: "none" }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>#{t.id} {t.title}</span>
                    <span className="badge badge-soft">{t.status}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(sugg.articles || []).length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8 }}>Knowledge base</p>
              {sugg.articles.map((a) => (
                <div key={a.id} className="card-soft" style={{ marginBottom: 8, padding: 16 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.title}</p>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{a.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
