import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function Customers() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [error, setError] = useState("");

  const load = () => api.listCustomers().then(setItems).catch((e) => setError(String(e.message).slice(0, 200)));

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.createCustomer(form);
      setForm({ name: "", email: "", company: "" });
      load();
    } catch (err) { setError(String(err.message).slice(0, 300)); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 40 }}>
        <h3>Customers</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Manage supported organizations and contacts.</p>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <div className="card" style={{ marginBottom: 32 }}>
        <h5 style={{ marginBottom: 16 }}>Create customer</h5>
        <form onSubmit={create} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ flex: "1 1 180px" }} />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={{ flex: "1 1 180px" }} />
          <input placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={{ flex: "1 1 180px" }} />
          <button type="submit" className="btn-primary">Create</button>
        </form>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/customers/${c.id}`}>{c.name}</Link></td>
                <td style={{ color: "var(--text-muted)" }}>{c.email || "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{c.company || "—"}</td>
                <td style={{ color: "var(--text-faint)", fontSize: 14 }}>{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {items.length === 0 && (
        <div className="card-soft" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-muted)" }}>No customers yet. Create one above.</p>
        </div>
      )}
    </div>
  );
}
