import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [devices, setDevices] = useState([]);
  const [form, setForm] = useState({ hostname: "", device_type: "laptop", os: "" });
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setCustomer(await api.getCustomer(id));
      setDevices(await api.listDevices(id));
    } catch (e) { setError(String(e.message).slice(0, 300)); }
  };

  useEffect(() => { load(); }, [id]);

  const register = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createDevice({ ...form, customer_id: Number(id) });
      setForm({ hostname: "", device_type: "laptop", os: "" });
      load();
    } catch (err) { setError(String(err.message).slice(0, 300)); }
  };

  if (!customer) return <p style={{ color: "var(--text-muted)" }}>Loading… {error}</p>;

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 8 }}>
        <Link to="/customers" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Customers</Link>
        <span style={{ color: "var(--text-faint)", margin: "0 8px" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-faint)" }}>{customer.name}</span>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h3>{customer.name}</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>
          {customer.email || "No email"} {customer.company && `· ${customer.company}`}
        </p>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <h5 style={{ marginBottom: 16 }}>Devices</h5>
      <div className="table-wrap" style={{ marginBottom: 32 }}>
        <table>
          <thead>
            <tr><th>Hostname</th><th>Type</th><th>OS</th><th>Serial</th></tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td style={{ fontWeight: 600 }}>{d.hostname}</td>
                <td><span className="badge badge-soft">{d.device_type}</span></td>
                <td style={{ color: "var(--text-muted)" }}>{d.os || "—"}</td>
                <td style={{ color: "var(--text-faint)" }}>{d.serial_number || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {devices.length === 0 && (
        <div className="card-soft" style={{ textAlign: "center", padding: 32, marginBottom: 32 }}>
          <p style={{ color: "var(--text-muted)" }}>No devices registered.</p>
        </div>
      )}

      <div className="card">
        <h5 style={{ marginBottom: 16 }}>Register device</h5>
        <form onSubmit={register} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input placeholder="Hostname" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} required style={{ flex: "1 1 160px" }} />
          <input placeholder="Type" value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} style={{ flex: "1 1 100px" }} />
          <input placeholder="OS" value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} style={{ flex: "1 1 120px" }} />
          <button type="submit" className="btn-primary">Register</button>
        </form>
      </div>
    </div>
  );
}
