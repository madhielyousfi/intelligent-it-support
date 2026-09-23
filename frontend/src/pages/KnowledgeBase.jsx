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
  const edit = async (article) => {
    const title = window.prompt("Article title", article.title);
    if (title === null || !title.trim()) return;
    const content = window.prompt("Article content", article.content);
    if (content === null || !content.trim()) return;
    try { await api.updateArticle(article.id, { title, content }); load(); }
    catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };
  const remove = async (article) => {
    if (!window.confirm(`Delete “${article.title}”?`)) return;
    try { await api.deleteArticle(article.id); load(); }
    catch (err) { setError(String(err.message || err).slice(0, 250)); }
  };

  return <div className="fade-in">
    <div style={{ marginBottom: 28 }}><h3>Knowledge base</h3><p style={{ color: "var(--text-muted)", marginTop: 4 }}>Reusable guidance and resolutions for faster support.</p></div>
    {error && <p className="error-msg" style={{ marginBottom: 16 }}>{error}</p>}
    <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} style={{ width: 220, marginBottom: 24 }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}><h5>{article.title}</h5>{canManage && <span style={{ display: "flex", gap: 8 }}><button className="btn-outline" onClick={() => edit(article)}>Edit</button><button className="btn-outline" onClick={() => remove(article)}>Delete</button></span>}</div>
        <p style={{ whiteSpace: "pre-wrap", color: "var(--text-muted)", marginTop: 10 }}>{article.content}</p>
      </article>)}
      {articles.length === 0 && <div className="card-soft" style={{ textAlign: "center", padding: 40 }}><p style={{ color: "var(--text-muted)" }}>No knowledge-base articles match this category.</p></div>}
    </div>
  </div>;
}
