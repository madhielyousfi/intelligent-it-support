import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function Manager() {
  const [stats, setStats] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.dashboard(), api.listTechnicians()])
      .then(([dashboard, team]) => { setStats(dashboard); setTechnicians(team); })
      .catch((err) => setError(String(err.message || err).slice(0, 250)));
  }, []);

  if (error) return <p className="error-msg">{error}</p>;
  if (!stats) return <p style={{ color: "var(--text-muted)" }}>Loading manager workspace…</p>;
  const cards = [["Open tickets", stats.open], ["Resolved", stats.resolved], ["Closed", stats.closed], ["Total", stats.total]];
  return <div className="fade-in">
    <div style={{ marginBottom: 32 }}><h3>Manager workspace</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>Monitor the support queue and assign technicians from ticket details.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(120px, 1fr))", gap: 16, marginBottom: 40 }}>
      {cards.map(([label, value]) => <div key={label} className="card-soft" style={{ textAlign: "center", padding: 24 }}><p style={{ color: "var(--text-muted)", fontSize: 13 }}>{label}</p><p style={{ fontSize: 32, fontWeight: 650 }}>{value}</p></div>)}
    </div>
    <div className="card" style={{ marginBottom: 28 }}><h5 style={{ marginBottom: 12 }}>Technician team</h5>
      {technicians.length ? <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{technicians.map((tech) => <div key={tech.id} style={{ display: "flex", justifyContent: "space-between" }}><span>{tech.full_name}</span><span style={{ color: "var(--text-muted)" }}>{tech.email}</span></div>)}</div> : <p style={{ color: "var(--text-muted)" }}>No active technicians.</p>}
    </div>
    <Link to="/tickets" className="btn-primary" style={{ textDecoration: "none" }}>Open ticket queue</Link>
  </div>;
}
