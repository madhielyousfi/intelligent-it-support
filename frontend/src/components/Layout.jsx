import { NavLink, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/admin", label: "Administration", roles: ["admin"] },
  { to: "/manager", label: "Manager workspace", roles: ["manager"] },
  { to: "/customers", label: "Customers", roles: ["admin", "manager"] },
  { to: "/tickets", label: "Tickets" },
  { to: "/knowledge-base", label: "Knowledge base" },
  { to: "/tickets/new", label: "New ticket", roles: ["admin", "manager", "customer"] },
];

export default function Layout({ children }) {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  let role = null;
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      role = payload.role;
    }
  } catch {}

  const visible = navItems.filter((n) => !n.roles || n.roles.includes(role));

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          padding: "32px 24px",
          borderRight: "1px solid var(--hairline)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 32 }}>
          <span style={{ fontSize: 20, fontWeight: 652, letterSpacing: "-0.02em", color: "var(--ink)" }}>ITSM</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)", marginLeft: 8, verticalAlign: "super" }}>MVP</span>
        </div>

        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              fontSize: 16,
              fontWeight: 600,
              color: isActive ? "var(--ink)" : "var(--text-muted)",
              background: isActive ? "var(--canvas-soft)" : "transparent",
              textDecoration: "none",
              transition: "background 0.15s, color 0.15s",
            })}
          >
            {item.label}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        {role && (
          <div style={{ padding: "8px 16px", marginBottom: 8 }}>
            <span className="badge badge-soft" style={{ textTransform: "capitalize" }}>{role}</span>
          </div>
        )}

        <button onClick={logout} className="btn-soft" style={{ width: "100%" }}>Logout</button>
      </aside>

      <main style={{ flex: 1, padding: "48px 56px", maxWidth: 960, animation: "fadeIn 0.2s ease-out" }}>
        {children}
      </main>
    </div>
  );
}
