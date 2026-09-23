import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

const PRIORITY_COLORS = { CRITICAL: "#c0392b", HIGH: "#e67e22", MEDIUM: "var(--ink)", LOW: "var(--text-faint)" };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(String(e.message).slice(0, 300)));
  }, []);

  if (error) return <p className="error-msg">{error}</p>;
  if (!data) return <p style={{ color: "var(--text-muted)" }}>Loading…</p>;

  const stats = [
    { label: "Total", value: data.total, accent: false },
    { label: "Open", value: data.open, accent: false },
    { label: "Resolved", value: data.resolved, accent: false },
    { label: "Closed", value: data.closed, accent: false },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 40 }}>
        <h3>Dashboard</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Overview of all support activity.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 48 }}>
        {stats.map((s) => (
          <div key={s.label} className="card-soft" style={{ textAlign: "center", padding: "32px 24px" }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 44, fontWeight: 652, lineHeight: 1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      <h5 style={{ marginBottom: 16 }}>Recent tickets</h5>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th></tr>
          </thead>
          <tbody>
            {(data.recent || []).map((t) => (
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
      {(!data.recent || data.recent.length === 0) && (
        <div className="card-soft" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-muted)" }}>No recent tickets.</p>
        </div>
      )}
    </div>
  );
}
