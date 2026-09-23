import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../services/api.js";

const EMPTY_DEVICE = { device_type: "Laptop", manufacturer: "", model: "", serial_number: "", operating_system: "" };

export default function CustomerDetail() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [devices, setDevices] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [form, setForm] = useState(EMPTY_DEVICE);
  const [error, setError] = useState("");
  let canManage = false;
  try { canManage = JSON.parse(atob(localStorage.getItem("token").split(".")[1])).role === "admin"; } catch {}
  const load = async () => { try { setCustomer(await api.getCustomer(id)); setDevices(await api.listDevices(id)); setTickets(await api.listTickets(undefined, undefined, id)); } catch (e) { setError(String(e.message).slice(0, 300)); } };
  useEffect(() => { load(); }, [id]);
  const register = async (e) => { e.preventDefault(); setError(""); try { await api.createDevice({ ...form, customer_id: Number(id) }); setForm(EMPTY_DEVICE); load(); } catch (err) { setError(String(err.message).slice(0, 300)); } };
  const editCustomer = async () => {
    const name = window.prompt("Name", customer.name); if (name === null || !name.trim()) return;
    const email = window.prompt("Email", customer.email || ""); if (email === null) return;
    const phone = window.prompt("Phone", customer.phone || ""); if (phone === null) return;
    const company = window.prompt("Company", customer.company || ""); if (company === null) return;
    const address = window.prompt("Address", customer.address || ""); if (address === null) return;
    try { await api.updateCustomer(id, { name, email, phone, company, address }); load(); } catch (err) { setError(String(err.message).slice(0, 300)); }
  };
  const removeCustomer = async () => {
    if (!window.confirm("Delete this customer? Customers with tickets or devices cannot be deleted.")) return;
    try { await api.deleteCustomer(id); window.location.href = "/customers"; } catch (err) { setError(String(err.message).slice(0, 300)); }
  };
  const editDevice = async (device) => {
    const device_type = window.prompt("Device type", device.device_type); if (device_type === null) return;
    const manufacturer = window.prompt("Manufacturer", device.manufacturer); if (manufacturer === null) return;
    const model = window.prompt("Model", device.model); if (model === null) return;
    const serial_number = window.prompt("Serial number", device.serial_number || ""); if (serial_number === null) return;
    const operating_system = window.prompt("Operating system", device.operating_system || ""); if (operating_system === null) return;
    try { await api.updateDevice(device.id, { device_type, manufacturer, model, serial_number, operating_system }); load(); } catch (err) { setError(String(err.message).slice(0, 300)); }
  };
  const removeDevice = async (device) => { if (!window.confirm(`Delete ${device.manufacturer} ${device.model}?`)) return; try { await api.deleteDevice(device.id); load(); } catch (err) { setError(String(err.message).slice(0, 300)); } };
  if (!customer) return <p style={{ color: "var(--text-muted)" }}>Loading… {error}</p>;
  return <div className="fade-in">
    <div style={{ marginBottom: 8 }}><Link to="/customers">Customers</Link><span style={{ margin: "0 8px" }}>/</span>{customer.name}</div>
    <div style={{ marginBottom: 32 }}><h3>{customer.name}</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>{customer.email || "No email"} · {customer.phone || "No phone"}</p><p style={{ color: "var(--text-muted)", marginTop: 4 }}>{customer.company || "No company"} · {customer.address || "No address"}</p>{canManage && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button className="btn-outline" onClick={editCustomer}>Edit customer</button><button className="btn-outline" onClick={removeCustomer}>Delete customer</button></div>}</div>
    {error && <p className="error-msg">{error}</p>}
    <h5 style={{ marginBottom: 16 }}>Devices</h5>
    <div className="table-wrap" style={{ marginBottom: 32 }}><table><thead><tr><th>Type</th><th>Manufacturer</th><th>Model</th><th>Serial</th><th>Operating system</th>{canManage && <th />}</tr></thead><tbody>{devices.map((d) => <tr key={d.id}><td>{d.device_type}</td><td>{d.manufacturer}</td><td>{d.model}</td><td>{d.serial_number || "—"}</td><td>{d.operating_system || "—"}</td>{canManage && <td style={{ display: "flex", gap: 6 }}><button className="btn-outline" onClick={() => editDevice(d)}>Edit</button><button className="btn-outline" onClick={() => removeDevice(d)}>Delete</button></td>}</tr>)}</tbody></table></div>
    <h5 style={{ marginBottom: 16 }}>Tickets</h5>
    <div className="table-wrap" style={{ marginBottom: 32 }}><table><thead><tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><Link to={`/tickets/${ticket.id}`}>#{ticket.id}</Link></td><td>{ticket.title}</td><td>{ticket.status}</td><td>{ticket.priority}</td></tr>)}</tbody></table></div>
    {canManage && <div className="card"><h5 style={{ marginBottom: 16 }}>Register device</h5><form onSubmit={register} style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      <input placeholder="Device type" value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} required />
      <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} required />
      <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
      <input placeholder="Serial number" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
      <input placeholder="Operating system" value={form.operating_system} onChange={(e) => setForm({ ...form, operating_system: e.target.value })} />
      <button type="submit" className="btn-primary">Register</button>
    </form></div>}
  </div>;
}
