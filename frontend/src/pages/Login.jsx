import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:3000/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter username and password!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("user", JSON.stringify({ username: data.username }));
        navigate("/scheduler");
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Cannot connect to server!");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 20, padding: 40, width: 360,
        backdropFilter: "blur(10px)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)"
      }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
            Academic Management System
          </div>
          <h1 style={{
            margin: 0, fontSize: 24, fontWeight: 800,
            background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Welcome Back
          </h1>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            color: "#fca5a5", fontSize: 12, textAlign: "center"
          }}>
            {error}
          </div>
        )}

        {/* Username */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Username
          </div>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter username"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0", fontSize: 14, outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            Password
          </div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Enter password"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              color: "#e2e8f0", fontSize: 14, outline: "none",
              boxSizing: "border-box"
            }}
          />
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 10, border: "none",
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            color: "white", fontSize: 14, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1, transition: "all 0.2s"
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
    </div>
  );
}