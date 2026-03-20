import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { label: "📅 Scheduler", path: "/scheduler" },
    { label: "📋 Schedules List", path: "/schedules" },
  ];

  return (
    <div style={{
      width: "220px",
      minHeight: "100vh",
      background: "rgba(255,255,255,0.03)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      position: "fixed",
      left: 0,
      top: 0,
      boxSizing: "border-box"
    }}>
      {/* Logo */}
      <div style={{ padding: "0 20px", marginBottom: 32 }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: "#64748b", textTransform: "uppercase", marginBottom: 4 }}>
          Academic
        </div>
        <div style={{
          fontSize: 18, fontWeight: 800,
          background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
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
              marginBottom: 4, fontSize: 13, fontWeight: 600,
              background: location.pathname === item.path
                ? "rgba(96,165,250,0.15)"
                : "transparent",
              color: location.pathname === item.path
                ? "#60a5fa"
                : "#94a3b8",
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

      {/* User & Logout */}
      <div style={{
        padding: "16px 20px",
        borderTop: "1px solid rgba(255,255,255,0.06)"
      }}>
        <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>
          Logged in as
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>
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