import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

import TicketStatusSelect, { STATUS_LABELS, ticketStatus } from "../components/TicketStatusSelect.jsx";

const STATUSES = ["", ...Object.keys(STATUS_LABELS)];
const PRIORITY_COLORS = { CRITICAL: "#c0392b", HIGH: "#e67e22", MEDIUM: "var(--ink)", LOW: "var(--text-faint)" };

export default function Tickets() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [createdDate, setCreatedDate] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(null);
  const requestVersion = useRef(0);
  const currentFilters = useRef([]);
  currentFilters.current = [status, priority, search, technicianId, createdDate, page];
  let role = "";
  let canCreateTicket = false;
  try {
    role = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).role;
    canCreateTicket = ["admin", "manager", "customer"].includes(role);
  } catch {}
  const canFilterByTechnician = ["admin", "manager"].includes(role);

  const load = async (s, p, q, tech, date, requestedPage) => {
    const version = ++requestVersion.current;
    try {
      const result = await api.listTickets(s || undefined, p || undefined, undefined, q || undefined, {
        technicianId: tech || undefined,
        createdDate: date || undefined,
        page: requestedPage, pageSize: 10, withMeta: true,
      });
      if (version !== requestVersion.current) return;
      if (requestedPage > 1 && result.items.length === 0) { setPage(requestedPage - 1); return; }
      setItems(result.items);
      setTotal(result.total);
      setError("");
    }
    catch (e) { if (version === requestVersion.current) setError(String(e.message).slice(0, 300)); }
  };

  useEffect(() => {
    const timer = setTimeout(() => load(status, priority, search, technicianId, createdDate, page), 250);
    return () => { clearTimeout(timer); requestVersion.current++; };
  }, [status, priority, search, technicianId, createdDate, page]);

  useEffect(() => {
    if (canFilterByTechnician) api.listTechnicians().then(setTechnicians).catch(() => setTechnicians([]));
  }, [canFilterByTechnician]);

  const updateStatus = async (ticket, newStatus) => {
    setSaving(ticket.id);
    setError("");
    setSuccess("");
    requestVersion.current++;
    try {
      const updated = await api.changeStatus(ticket.id, newStatus);
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`Ticket #${ticket.id} updated to ${STATUS_LABELS[ticketStatus(updated.status)]}.`);
      await load(...currentFilters.current);
    } catch (e) { setError(String(e.message).slice(0, 300)); }
    finally { setSaving(null); }
  };

  const resetToFirstPage = (setter) => (event) => { setter(event.target.value); setPage(1); };
  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 40, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h3>Tickets</h3>
          <p style={{ color: "var(--text-muted)", marginTop: 4 }}>{total} ticket{total !== 1 ? "s" : ""}</p>
        </div>
        {canCreateTicket && <Link to="/tickets/new" className="btn-primary" style={{ textDecoration: "none" }}>New ticket</Link>}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 24, flexWrap: "wrap" }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={status === s ? "badge badge-ink" : "badge badge-soft"}
            style={{ cursor: "pointer" }}
          >
            {STATUS_LABELS[s] || "All"}
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={resetToFirstPage(setSearch)}
        placeholder="Search ticket ID, title, or description…"
        aria-label="Search tickets"
        style={{ width: "100%", maxWidth: 420, marginBottom: 16 }}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
      <select value={priority} onChange={resetToFirstPage(setPriority)} style={{ width: 180 }}>
        <option value="">All priorities</option>
        <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
      </select>
      {canFilterByTechnician && <select value={technicianId} onChange={resetToFirstPage(setTechnicianId)} style={{ width: 200 }}>
        <option value="">All technicians</option>
        {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.full_name}</option>)}
      </select>}
      <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14 }}>
        Created on
        <input
          type="date"
          aria-label="Created on"
          value={createdDate}
          onChange={resetToFirstPage(setCreatedDate)}
          title="Created on"
          style={{ width: 180, boxSizing: "border-box" }}
        />
      </label>
      </div>

      {success && <p role="status" style={{ marginBottom: 16, color: "#237347" }}>{success}</p>}
      {error && <p role="alert" className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

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
                <td>{role === "admin" ? <TicketStatusSelect ticket={t} disabled={saving !== null} onChange={(value) => updateStatus(t, value)} /> : <span className="badge badge-soft">{STATUS_LABELS[ticketStatus(t.status)]}</span>}</td>
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
      {total > 0 && <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
        <button className="btn-secondary" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Page {page} of {totalPages}</span>
        <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>}
    </div>
  );
}
