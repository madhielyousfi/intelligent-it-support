import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../services/api.js";

export default function TicketCreate() {
  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [deviceError, setDeviceError] = useState("");
  const [deviceRetry, setDeviceRetry] = useState(0);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ customer_id: "", device_id: "", category_id: "", title: "", description: "", priority: "MEDIUM" });
  const [error, setError] = useState("");
  const [ocrMsg, setOcrMsg] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.listCustomers(), api.listCategories()])
      .then(([c, cats]) => { setCustomers(c); setCategories(cats); })
      .catch((e) => setError(String(e.message).slice(0, 300)));
  }, []);

  useEffect(() => {
    let active = true;
    setDevices([]);
    setDeviceError("");
    setDevicesLoading(Boolean(form.customer_id));
    if (form.customer_id) {
      api.listDevices(form.customer_id)
        .then((items) => { if (active) setDevices(items); })
        .catch((err) => { if (active) setDeviceError(`Could not load devices: ${err.message}`); })
        .finally(() => { if (active) setDevicesLoading(false); });
    }
    return () => { active = false; };
  }, [form.customer_id, deviceRetry]);

  useEffect(() => {
    const title = form.title.trim();
    const description = form.description.trim();
    if (title.length < 4 || description.length < 12) {
      setAiSuggestion(null);
      return undefined;
    }
    const timer = setTimeout(() => {
      api.predictTicketCategory({ title, description }).then(setAiSuggestion).catch(() => setAiSuggestion(null));
    }, 450);
    return () => clearTimeout(timer);
  }, [form.title, form.description]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (devicesLoading || deviceError || !devices.some((device) => String(device.id) === form.device_id)) {
      setError("Select a registered device for this customer before creating the ticket.");
      return;
    }
    try {
      const body = {
        customer_id: Number(form.customer_id),
        device_id: form.device_id ? Number(form.device_id) : null,
        category_id: form.category_id ? Number(form.category_id) : null,
        title: form.title,
        description: form.description,
        priority: form.priority,
      };
      const t = await api.createTicket(body);
      navigate(`/tickets/${t.id}`);
    } catch (err) { setError(String(err.message).slice(0, 300)); }
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 8 }}>
        <Link to="/tickets" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>Tickets</Link>
        <span style={{ color: "var(--text-faint)", margin: "0 8px" }}>/</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-faint)" }}>New</span>
      </div>
      <div style={{ marginBottom: 40 }}>
        <h3>New ticket</h3>
        <p style={{ color: "var(--text-muted)", marginTop: 4 }}>Create a support request for a customer.</p>
      </div>

      {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 540 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Customer *</label>
          <select value={form.customer_id} onChange={(e) => setForm((current) => ({ ...current, customer_id: e.target.value, device_id: "" }))} required>
            <option value="">Select customer</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Device *</label>
            <select value={form.device_id} onChange={set("device_id")} required disabled={!form.customer_id || devicesLoading || !!deviceError || devices.length === 0}>
              <option value="">{!form.customer_id ? "Select a customer first" : devicesLoading ? "Loading devices…" : devices.length === 0 ? "No devices available" : "Select device"}</option>
              {devices.map((d) => <option key={d.id} value={d.id}>{d.manufacturer} {d.model}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Category *</label>
            <select value={form.category_id} onChange={set("category_id")} required>
              <option value="">Select category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {deviceError && <div role="alert" className="error-msg">{deviceError} <button type="button" className="btn-outline" onClick={() => setDeviceRetry((value) => value + 1)}>Retry</button></div>}
        {form.customer_id && !devicesLoading && !deviceError && devices.length === 0 && (
          <p role="status" style={{ color: "var(--text-muted)" }}>
            This customer has no registered devices. An administrator must register a device before you can create a ticket. <Link to={`/customers/${form.customer_id}`}>Open customer devices</Link>
          </p>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Title *</label>
          <input placeholder="Brief summary of the issue" value={form.title} onChange={set("title")} required />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Description *</label>
          <textarea placeholder="Detailed description of the problem" value={form.description} onChange={set("description")} required rows={4} />
        </div>

        {aiSuggestion?.category && (
          <div className="card-soft" style={{ padding: 16 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>AI category suggestion</p>
            <p style={{ color: "var(--text-muted)", marginBottom: 10 }}>
              {aiSuggestion.category} ({Math.round(aiSuggestion.confidence * 100)}% confidence). You remain in control of the final category.
            </p>
            <button type="button" className="btn-outline" onClick={() => {
              const suggested = categories.find((category) => category.name === aiSuggestion.category);
              if (suggested) setForm((current) => ({ ...current, category_id: String(suggested.id) }));
            }}>Use {aiSuggestion.category}</button>
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Screenshot (optional OCR)</label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (e) => {
              const f = e.target.files[0];
              if (!f) return;
              setOcrMsg("Extracting text…");
              try {
                const r = await api.ocrExtract(f);
                if (r.text) setForm((prev) => ({ ...prev, description: prev.description ? prev.description + "\n[OCR]\n" + r.text : r.text }));
                setOcrMsg(r.text ? `${r.characters} characters extracted and appended.` : "No readable text found in image.");
              } catch (err) { setOcrMsg("OCR failed: " + String(err.message).slice(0, 120)); }
            }}
          />
          {ocrMsg && <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 6 }}>{ocrMsg}</p>}
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>Priority</label>
          <select value={form.priority} onChange={set("priority")}>
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" disabled={devicesLoading || !!deviceError || !form.device_id} className="btn-primary" style={{ padding: "12px 32px" }}>Create ticket</button>
          <Link to="/tickets" className="btn-outline" style={{ padding: "12px 24px", textDecoration: "none" }}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
