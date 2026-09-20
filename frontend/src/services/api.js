const API = import.meta.env.VITE_API_URL || "";

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  if (res.status === 401) {
    localStorage.removeItem("token");
    if (window.location.pathname !== "/login") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (email, password) =>
    fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(handle),
  me: () => fetch(`${API}/auth/me`, { headers: authHeaders() }).then(handle),
  listCustomers: () => fetch(`${API}/customers`, { headers: authHeaders() }).then(handle),
  getCustomer: (id) => fetch(`${API}/customers/${id}`, { headers: authHeaders() }).then(handle),
  createCustomer: (body) =>
    fetch(`${API}/customers`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  listDevices: (customerId) =>
    fetch(`${API}/devices${customerId ? `?customer_id=${customerId}` : ""}`, { headers: authHeaders() }).then(handle),
  createDevice: (body) =>
    fetch(`${API}/devices`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  listCategories: () => fetch(`${API}/categories`, { headers: authHeaders() }).then(handle),
  listTickets: (status) =>
    fetch(`${API}/tickets${status ? `?status=${status}` : ""}`, { headers: authHeaders() }).then(handle),
  getTicket: (id) => fetch(`${API}/tickets/${id}`, { headers: authHeaders() }).then(handle),
  createTicket: (body) =>
    fetch(`${API}/tickets`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  assignTicket: (id, technician_id) =>
    fetch(`${API}/tickets/${id}/assign`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ technician_id }) }).then(handle),
  changeStatus: (id, status) =>
    fetch(`${API}/tickets/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  resolveTicket: (id, resolution) =>
    fetch(`${API}/tickets/${id}/resolve`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ resolution }) }).then(handle),
  listTechnicians: () => fetch(`${API}/users/technicians`, { headers: authHeaders() }).then(handle),
  dashboard: () => fetch(`${API}/dashboard/stats`, { headers: authHeaders() }).then(handle),
  suggestions: (id) => fetch(`${API}/tickets/${id}/suggestions`, { headers: authHeaders() }).then(handle),
  ocrExtract: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem("token");
    return fetch(`${API}/ocr/extract`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(handle);
  },
};
