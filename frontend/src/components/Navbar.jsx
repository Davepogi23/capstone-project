import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));
  const isLight = theme === "light";

  const handleLogout = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      await fetch("http://localhost:3000/api/lock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username })
      });
    }
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { label: "📅 Scheduler", path: "/scheduler" },
    { label: "📋 Schedules List", path: "/schedules" },
    { label: "👤 User Management", path: "/users" },
  ];

  return (
    <div style={{
      width: "220px",
      minHeight: "100vh",
      background: isLight ? "#f8fafc" : "linear-gradient(180deg, #0f0c29, #1a1744)",
      borderRight: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      position: "fixed",
      left: 0,
      top: 0,
      boxSizing: "border-box"
    }}>

      {/* ACLC Logo */}
      <div style={{ padding: "0 20px", marginBottom: 24, textAlign: "center" }}>
        <img
          src="/aclc-logo.png"
          alt="ACLC Logo"
          style={{
            width: 90,
            height: 90,
            objectFit: "contain",
            borderRadius: "50%",
            boxShadow: isLight
              ? "0 2px 12px rgba(0,0,0,0.12)"
              : "0 2px 12px rgba(0,0,0,0.4)"
          }}
        />
        <div style={{
          fontSize: 11, letterSpacing: 2, marginTop: 8,
          color: isLight ? "#64748b" : "#94a3b8",
          textTransform: "uppercase", fontWeight: 600
        }}>
          Class Scheduler
        </div>
      </div>

      {/* Nav Items */}
      <div style={{ flex: 1, padding: "0 12px" }}>
        {navItems.map(item => (
          <div
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: "12px 16px", borderRadius: 10, cursor: "pointer",
              marginBottom: 4, fontSize: 14, fontWeight: 700,
              background: location.pathname === item.path
                ? "rgba(96,165,250,0.15)"
                : "transparent",
              color: location.pathname === item.path
                ? "#60a5fa"
                : isLight ? "#64748b" : "#94a3b8",
              borderLeft: location.pathname === item.path
                ? "3px solid #60a5fa"
                : "3px solid transparent",
              transition: "all 0.15s"
            }}
          >
            {item.label}
          </div>
        ))}
      </div>

      {/* Theme Toggle */}
      <div style={{ padding: "0 20px", marginBottom: 16 }}>
        <button
          onClick={toggleTheme}
          style={{
            width: "100%", padding: "10px", borderRadius: 8,
            border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            background: isLight ? "white" : "rgba(255,255,255,0.05)",
            color: isLight ? "#475569" : "#94a3b8",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8
          }}
        >
          {isLight ? "🌙 Dark Mode" : "☀️ Light Mode"}
        </button>
      </div>

      {/* User & Logout */}
      <div style={{
        padding: "16px 20px",
        borderTop: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ fontSize: 11, color: isLight ? "#94a3b8" : "#64748b", marginBottom: 4 }}>
          Logged in as
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: isLight ? "#1e293b" : "#e2e8f0", marginBottom: 12 }}>
          {user?.username}
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: "100%", padding: "10px", borderRadius: 8, border: "none",
            background: "rgba(239,68,68,0.15)",
            color: "#fca5a5", fontSize: 12, fontWeight: 700,
            cursor: "pointer", transition: "all 0.15s"
          }}
        >
          🚪 Logout
        </button>
      </div>
    </div>
  );
}
