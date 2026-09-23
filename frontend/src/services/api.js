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
  updateCustomer: (id, body) =>
    fetch(`${API}/customers/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteCustomer: (id) => fetch(`${API}/customers/${id}`, { method: "DELETE", headers: authHeaders() }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);
    return null;
  }),
  listDevices: (customerId) =>
    fetch(`${API}/devices${customerId ? `?customer_id=${customerId}` : ""}`, { headers: authHeaders() }).then(handle),
  createDevice: (body) =>
    fetch(`${API}/devices`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateDevice: (id, body) =>
    fetch(`${API}/devices/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteDevice: (id) => fetch(`${API}/devices/${id}`, { method: "DELETE", headers: authHeaders() }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);
    return null;
  }),
  listCategories: () => fetch(`${API}/categories`, { headers: authHeaders() }).then(handle),
  listTickets: (status, priority, customerId, search, options = {}) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (priority) params.set("priority", priority);
    if (customerId) params.set("customer_id", customerId);
    if (search) params.set("search", search);
    if (options.technicianId) params.set("technician_id", options.technicianId);
    if (options.createdFrom) params.set("created_from", options.createdFrom);
    if (options.createdTo) params.set("created_to", options.createdTo);
    if (options.page) params.set("page", options.page);
    if (options.pageSize) params.set("page_size", options.pageSize);
    const query = params.toString();
    return fetch(`${API}/tickets${query ? `?${query}` : ""}`, { headers: authHeaders() }).then(async (res) => {
      const items = await handle(res);
      if (!options.withMeta) return items;
      return {
        items,
        total: Number(res.headers.get("X-Total-Count") || 0),
        page: Number(res.headers.get("X-Page") || options.page || 1),
        pageSize: Number(res.headers.get("X-Page-Size") || options.pageSize || 10),
      };
    });
  },
  getTicket: (id) => fetch(`${API}/tickets/${id}`, { headers: authHeaders() }).then(handle),
  createTicket: (body) =>
    fetch(`${API}/tickets`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  predictTicketCategory: (body) =>
    fetch(`${API}/tickets/predict-category`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  assignTicket: (id, technician_id) =>
    fetch(`${API}/tickets/${id}/assign`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ technician_id }) }).then(handle),
  changeStatus: (id, status) =>
    fetch(`${API}/tickets/${id}/status`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ status }) }).then(handle),
  resolveTicket: (id, resolution) =>
    fetch(`${API}/tickets/${id}/resolve`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify({ resolution }) }).then(handle),
  listTechnicians: () => fetch(`${API}/users/technicians`, { headers: authHeaders() }).then(handle),
  listUsers: () => fetch(`${API}/users`, { headers: authHeaders() }).then(handle),
  createUser: (body) => fetch(`${API}/users`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateUser: (id, body) => fetch(`${API}/users/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  createCategory: (body) => fetch(`${API}/categories`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateCategory: (id, body) => fetch(`${API}/categories/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteCategory: (id) => fetch(`${API}/categories/${id}`, { method: "DELETE", headers: authHeaders() }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);
    return null;
  }),
  listArticles: (categoryId) => fetch(`${API}/articles${categoryId ? `?category_id=${categoryId}` : ""}`, { headers: authHeaders() }).then(handle),
  createArticle: (body) => fetch(`${API}/articles`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  updateArticle: (id, body) => fetch(`${API}/articles/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(body) }).then(handle),
  deleteArticle: (id) => fetch(`${API}/articles/${id}`, { method: "DELETE", headers: authHeaders() }).then(async (res) => {
    if (!res.ok) throw new Error((await res.text()) || `Request failed: ${res.status}`);
    return null;
  }),
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
