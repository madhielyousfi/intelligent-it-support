import { useEffect, useState } from "react";
import { api } from "../services/api.js";

const EMPTY_ARTICLE = { title: "", content: "", category_id: "" };

function roleFromToken() {
  try { return JSON.parse(atob(localStorage.getItem("token").split(".")[1])).role; }
  catch { return ""; }
}

export default function KnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [form, setForm] = useState(EMPTY_ARTICLE);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_ARTICLE);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const canManage = ["admin", "manager"].includes(roleFromToken());

  const load = () => Promise.all([api.listArticles(categoryId || undefined), api.listCategories()])
    .then(([nextArticles, nextCategories]) => { setArticles(nextArticles); setCategories(nextCategories); setError(""); })
    .catch((err) => setError(String(err.message || err).slice(0, 250)));
  useEffect(() => { load(); }, [categoryId]);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await api.createArticle({ ...form, category_id: form.category_id ? Number(form.category_id) : null });
      setForm(EMPTY_ARTICLE); load();
    } catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const edit = (article) => {
    setEditingId(article.id);
    setDraft({ title: article.title, content: article.content, category_id: article.category_id ?? "" });
    setError("");
    setSuccess("");
  };
  const saveEdit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!draft.title.trim() || !draft.content.trim()) {
      setError("Enter an article title and content.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await api.updateArticle(editingId, {
        title: draft.title.trim(), content: draft.content.trim(),
        category_id: draft.category_id ? Number(draft.category_id) : null,
      });
      setArticles((current) => current.map((article) => article.id === updated.id ? updated : article)
        .filter((article) => !categoryId || String(article.category_id) === categoryId));
      setEditingId(null);
      setSuccess("Article updated successfully.");
    } catch (err) { setError(String(err.message || err).slice(0, 250)); }
    finally { setSaving(false); }
  };
  const remove = async (article) => {
    if (!window.confirm(`Delete “${article.title}”?`)) return;
    try { await api.deleteArticle(article.id); load(); }
    catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };

  return <div className="fade-in">
    <div style={{ marginBottom: 28 }}><h3>Knowledge base</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>Reusable guidance and resolutions for faster support.</p></div>
    {success && <p role="status" style={{ color: "#237347", marginBottom: 16 }}>{success}</p>}
    {error && <p role="alert" className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}
    <select value={categoryId} disabled={saving} onChange={(event) => { setCategoryId(event.target.value); setEditingId(null); }} style={{ width: 220, marginBottom: 24 }}>
      <option value="">All categories</option>
      {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
    </select>
    {canManage && <div className="card" style={{ marginBottom: 28 }}>
      <h5 style={{ marginBottom: 16 }}>Create article</h5>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input required placeholder="Article title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <textarea required rows={4} placeholder="Helpful steps or guidance" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
        <select value={form.category_id} onChange={(event) => setForm({ ...form, category_id: event.target.value })}>
          <option value="">All categories</option>
          {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
        </select>
        <button className="btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>Publish article</button>
      </form>
    </div>}
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {articles.map((article) => <article className="card" key={article.id}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><h5>{article.title}</h5>{canManage && <span style={{ display: "flex", gap: 8 }}><button className="btn-outline" disabled={saving} onClick={() => edit(article)}>Edit</button><button className="btn-outline" disabled={saving} onClick={() => remove(article)}>Delete</button></span>}</div>
        {editingId === article.id ? <form onSubmit={saveEdit} aria-label="Edit article" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <label htmlFor={`article-title-${article.id}`}>Title</label>
          <input id={`article-title-${article.id}`} required autoFocus disabled={saving} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
          <label htmlFor={`article-content-${article.id}`}>Content</label>
          <textarea id={`article-content-${article.id}`} required rows={6} disabled={saving} value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} />
          <label htmlFor={`article-category-${article.id}`}>Category</label>
          <select id={`article-category-${article.id}`} disabled={saving} value={draft.category_id} onChange={(event) => setDraft({ ...draft, category_id: event.target.value })}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" className="btn-outline" disabled={saving} onClick={() => { setEditingId(null); setError(""); }}>Cancel</button>
          </div>
        </form> : <p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", marginTop: 10 }}>{article.content}</p>}
      </article>)}
      {articles.length === 0 && <div className="card-soft" style={{ textAlign: "center", padding: 40 }}><p style={{ color: "var(--text-muted)" }}>No knowledge-base articles match this category.</p></div>}
    </div>
  </div>;
}
