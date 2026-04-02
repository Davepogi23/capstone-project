import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "http://localhost:3000/api";

export default function Login({ theme }) {
  const isLight = theme === "light";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
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
      background: isLight ? "#f1f5f9" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>

      {/* ACLC Background Logo */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "url('/aclc-logo.png')",
        backgroundSize: "50%",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        opacity: 0.30,
        zIndex: 0
      }} />

      {/* Login Card Wrapper */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          background: isLight ? "white" : "rgba(255,255,255,0.05)",
          border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20, padding: 40, width: 360,
          backdropFilter: "blur(10px)",
          boxShadow: isLight ? "0 4px 24px rgba(0,0,0,0.08)" : "0 20px 60px rgba(0,0,0,0.4)"
        }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎓</div>
            <div style={{ fontSize: 11, letterSpacing: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Web Based Class Scheduling for ACLC
            </div>
            <h1 style={{
              margin: 0, fontSize: 24, fontWeight: 800,
              background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
            }}>
              {showForgot ? "Forgot Password" : "Welcome Back"}
            </h1>
          </div>

          {/* ===== FORGOT PASSWORD VIEW ===== */}
          {showForgot ? (
            <div>
              <div style={{
                background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)",
                borderRadius: 12, padding: 20, marginBottom: 20, textAlign: "center"
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🔒</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#60a5fa", marginBottom: 8 }}>
                  Password Reset
                </div>
                <div style={{ fontSize: 13, color: isLight ? "#475569" : "#94a3b8", lineHeight: 1.6 }}>
                  Please contact your <strong>System Administrator</strong> to reset your password.
                </div>
                <div style={{
                  marginTop: 16, padding: "10px 14px", borderRadius: 8,
                  background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)",
                  fontSize: 12, color: isLight ? "#64748b" : "#94a3b8"
                }}>
                  📧 Ask your admin to go to<br />
                  <strong style={{ color: "#a78bfa" }}>User Management → Reset Password</strong>
                </div>
              </div>
              <button
                onClick={() => setShowForgot(false)}
                style={{
                  width: "100%", padding: "12px", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer"
                }}
              >← Back to Login</button>
            </div>

          ) : (
            <>
              {error && (
                <div style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 16,
                  color: "#fca5a5", fontSize: 12, textAlign: "center"
                }}>
                  {error}
                </div>
              )}

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
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
                    color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 14, outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: 8 }}>
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
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
                    color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 14, outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ textAlign: "right", marginBottom: 20 }}>
                <span
                  onClick={() => setShowForgot(true)}
                  style={{
                    fontSize: 12, color: "#60a5fa", cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Forgot Password?
                </span>
              </div>

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
            </>
          )}

        </div>
      </div>

    </div>
  );
}
