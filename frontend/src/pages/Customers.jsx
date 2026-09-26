import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api.js";
import "./Customers.css";

const EMPTY_DEVICE = { device_type: "Laptop", manufacturer: "", model: "", serial_number: "", operating_system: "" };

export default function Customers() {
  const [device, setDevice] = useState(EMPTY_DEVICE);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", address: "" });
  const [createdCustomer, setCreatedCustomer] = useState(null);
  const [error, setError] = useState("");
  let canManage = false;
  try { canManage = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).role === "admin"; } catch {}

  const load = () => api.listCustomers().then(setItems).catch((e) => setError(String(e.message).slice(0, 200)));

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError("");
    setCreatedCustomer(null);
    setSaving(true);
    try {
      const customer = await api.createCustomer({ ...form, device });
      setCreatedCustomer({ ...customer, hasDevice: true });
      setDevice(EMPTY_DEVICE);
      setForm({ name: "", email: "", phone: "", company: "", address: "" });
      load();
    } catch (err) { setError(String(err.message).slice(0, 300)); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 40 }}>
        <h3>Customers</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Manage supported organizations and contacts.</p>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      {createdCustomer && <p role="status" className="customer-created-message">
        Customer “{createdCustomer.name}” created successfully.
        <> Device registered. <Link to="/tickets/new">Create a ticket</Link></>
      </p>}

      {canManage && <div className="card customer-create-card">
        <div className="customer-create-header">
          <h5>Create customer</h5>
          <p>Add contact details and their first device.</p>
        </div>
        <form onSubmit={create} className="customer-create-form">
          <div className="customer-create-sections">
            <section aria-labelledby="customer-contact-heading" className="customer-form-section">
              <div className="customer-section-heading">
                <h6 id="customer-contact-heading">Customer information</h6>
                <p>Organization and contact details</p>
              </div>
              <div className="customer-fields">
                {[
                  ["name", "Name", "Full name", true],
                  ["email", "Email", "name@example.com", false],
                  ["phone", "Phone", "+212 600 000 000", false],
                  ["company", "Company", "Company name", false],
                  ["address", "Address", "Street, city, postal code", false],
                ].map(([key, label, placeholder, required]) => (
                  <label key={key} className={`customer-field${key === "address" ? " customer-field-wide" : ""}`}>
                    <span>{label}{required && <span className="customer-required"> *</span>}</span>
                    <input type={key === "phone" ? "tel" : "text"} placeholder={placeholder} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={required} disabled={saving} />
                  </label>
                ))}
              </div>
            </section>
            <section aria-labelledby="customer-device-heading" className="customer-form-section customer-device-section">
              <div className="customer-section-heading">
                <h6 id="customer-device-heading">Device information</h6>
                <p>Available immediately for support tickets</p>
              </div>
              <div className="customer-fields">
                <label className="customer-field customer-field-wide">
                  <span>Device type<span className="customer-required"> *</span></span>
                  <select value={device.device_type} onChange={(e) => setDevice({ ...device, device_type: e.target.value })} required disabled={saving}>
                    {["Laptop", "Desktop", "Printer", "Server", "Phone", "Tablet", "Network equipment", "Other"].map((type) => <option key={type}>{type}</option>)}
                  </select>
                </label>
                {[
                  ["manufacturer", "Manufacturer", "e.g. Dell", true],
                  ["model", "Model", "e.g. Latitude 5520", true],
                  ["serial_number", "Serial number", "Device serial number", false],
                  ["operating_system", "Operating system", "e.g. Windows 11", false],
                ].map(([key, label, placeholder, required]) => (
                  <label key={key} className="customer-field">
                    <span>{label}{required && <span className="customer-required"> *</span>}</span>
                    <input placeholder={placeholder} value={device[key]} onChange={(e) => setDevice({ ...device, [key]: e.target.value })} required={required} disabled={saving} />
                  </label>
                ))}
              </div>
            </section>
          </div>
          <div className="customer-create-footer">
            <p><span className="customer-required">*</span> Required fields</p>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Create customer and device"}</button>
          </div>
        </form>
      </div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Company</th>
              <th>Phone</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/customers/${c.id}`}>{c.name}</Link></td>
                <td style={{ color: "var(--text-muted)" }}>{c.email || "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{c.company || "—"}</td>
                <td style={{ color: "var(--text-muted)" }}>{c.phone || "—"}</td>
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
