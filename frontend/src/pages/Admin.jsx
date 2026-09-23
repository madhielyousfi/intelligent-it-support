import { useEffect, useState } from "react";
import { api } from "../services/api.js";

const EMPTY_USER = { email: "", password: "", full_name: "", role: "technician" };

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userForm, setUserForm] = useState(EMPTY_USER);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");

  const load = () => Promise.all([api.listUsers(), api.listCategories()])
    .then(([nextUsers, nextCategories]) => { setUsers(nextUsers); setCategories(nextCategories); })
    .catch((err) => setError(String(err.message || err).slice(0, 250)));
  useEffect(() => { load(); }, []);

  const createUser = async (event) => {
    event.preventDefault(); setError("");
    try { await api.createUser(userForm); setUserForm(EMPTY_USER); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const createCategory = async (event) => {
    event.preventDefault(); setError("");
    try { await api.createCategory({ name: categoryName }); setCategoryName(""); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const toggleUser = async (user) => {
    try { await api.updateUser(user.id, { is_active: !user.is_active }); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const editUser = async (user) => {
    const full_name = window.prompt("Full name", user.full_name);
    if (full_name === null) return;
    const email = window.prompt("Email", user.email);
    if (email === null) return;
    const password = window.prompt("New password (leave empty to keep current password)", "");
    try {
      const body = { full_name, email };
      if (password) body.password = password;
      await api.updateUser(user.id, body); load();
    } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const removeCategory = async (category) => {
    if (!window.confirm(`Delete category ${category.name}?`)) return;
    try { await api.deleteCategory(category.id); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const editCategory = async (category) => {
    const name = window.prompt("Category name", category.name);
    if (name === null || !name.trim()) return;
    const description = window.prompt("Description", category.description || "");
    try { await api.updateCategory(category.id, { name, description }); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };

  return <div className="fade-in">
    <div style={{ marginBottom: 32 }}><h3>Administration</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>Manage accounts and ticket categories.</p></div>
    {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}
    <div className="card" style={{ marginBottom: 28 }}><h5 style={{ marginBottom: 16 }}>Create user</h5>
      <form onSubmit={createUser} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input placeholder="Full name" value={userForm.full_name} onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })} required />
        <input type="email" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
        <input type="password" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} minLength="6" required />
        <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}><option value="customer">Customer</option><option value="technician">Technician</option><option value="manager">Manager</option><option value="admin">Admin</option></select>
        <button className="btn-primary" type="submit">Create user</button>
      </form>
    </div>
    <div className="table-wrap" style={{ marginBottom: 36 }}><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead><tbody>
      {users.map((user) => <tr key={user.id}><td>{user.full_name}</td><td>{user.email}</td><td><select value={user.role} onChange={async (event) => { try { await api.updateUser(user.id, { role: event.target.value }); load(); } catch (err) { setError(String(err.message || err).slice(0, 250)); } }}><option value="customer">Customer</option><option value="technician">Technician</option><option value="manager">Manager</option><option value="admin">Admin</option></select></td><td>{user.is_active ? "Active" : "Inactive"}</td><td style={{ display: "flex", gap: 6 }}><button className="btn-outline" onClick={() => editUser(user)}>Edit</button><button className="btn-outline" onClick={() => toggleUser(user)}>{user.is_active ? "Deactivate" : "Activate"}</button></td></tr>)}
    </tbody></table></div>
    <div className="card"><h5 style={{ marginBottom: 16 }}>Categories</h5>
      <form onSubmit={createCategory} style={{ display: "flex", gap: 10, marginBottom: 16 }}><input placeholder="New category name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required /><button className="btn-primary" type="submit">Add category</button></form>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{categories.map((category) => <span key={category.id} className="badge badge-soft">{category.name} <button onClick={() => editCategory(category)} style={{ border: 0, background: "transparent", cursor: "pointer" }} aria-label={`Edit ${category.name}`}>✎</button><button onClick={() => removeCategory(category)} style={{ border: 0, background: "transparent", cursor: "pointer" }} aria-label={`Delete ${category.name}`}>×</button></span>)}</div>
    </div>
  </div>;
}
