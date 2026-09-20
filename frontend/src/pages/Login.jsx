import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api.js";

export default function Login() {
  const [email, setEmail] = useState("admin@itsm.local");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await api.login(email, password);
      localStorage.setItem("token", data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(String(err.message || err).slice(0, 300));
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--canvas-soft)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          padding: 48,
          background: "var(--canvas)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--hairline-soft)",
        }}
      >
        <div style={{ marginBottom: 40, textAlign: "center" }}>
          <h3 style={{ marginBottom: 8 }}>Welcome back.</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 16 }}>
            Sign in to your ITSM workspace.
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.local"
              required
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" style={{ width: "100%", padding: "12px 16px", marginTop: 8 }}>
            Sign in
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", fontSize: 14, color: "var(--text-faint)" }}>
          Demo: admin@itsm.local / admin123
        </p>
      </div>
    </div>
  );
}
