import { useState, useEffect } from "react";

const API = "http://localhost:3000/api";

export default function UserManagement({ theme }) {
  const isLight = theme === "light";
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Add user form
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Reset password
  const [resetUserId, setResetUserId] = useState(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const res = await fetch(`${API}/users`);
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast("Please fill in all fields!", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match!", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters!", "error");
      return;
    }
    try {
      const res = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      setUsers(prev => [...prev, data]);
      setNewUsername("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("User added successfully!", "success");
    } catch (err) {
      showToast("Failed to add user!", "error");
    }
  };

  const handleDeleteUser = async (id, username) => {
    if (users.length <= 1) {
      showToast("Cannot delete the last admin account!", "error");
      return;
    }
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await fetch(`${API}/users/${id}`, { method: "DELETE" });
      setUsers(prev => prev.filter(u => u.id !== id));
      showToast("User deleted!", "success");
    } catch (err) {
      showToast("Failed to delete user!", "error");
    }
  };

  const handleResetPassword = async (id) => {
    if (!resetPassword.trim()) {
      showToast("Please enter a new password!", "error");
      return;
    }
    if (resetPassword !== resetConfirm) {
      showToast("Passwords do not match!", "error");
      return;
    }
    if (resetPassword.length < 6) {
      showToast("Password must be at least 6 characters!", "error");
      return;
    }
    try {
      const res = await fetch(`${API}/users/${id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      setResetUserId(null);
      setResetPassword("");
      setResetConfirm("");
      showToast("Password reset successfully!", "success");
    } catch (err) {
      showToast("Failed to reset password!", "error");
    }
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      color: "#e2e8f0", fontSize: 20
    }}>Loading...</div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: isLight ? "#f1f5f9" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Segoe UI', sans-serif",
      color: isLight ? "#1e293b" : "#e2e8f0",
      padding: 32
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "white", padding: "10px 18px", borderRadius: 10,
          fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 13
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
          Web Based Class Scheduling for ACLC
        </div>
        <h1 style={{
          margin: 0, fontSize: 28, fontWeight: 800,
          background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>User Management</h1>
        <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Manage admin accounts for the scheduling system
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 900 }}>

        {/* ===== CURRENT USERS ===== */}
        <div style={{
          background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
          border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden", boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
        }}>
          <div style={{
            padding: "14px 20px",
            background: "rgba(96,165,250,0.1)",
            borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
            fontSize: 14, fontWeight: 700, color: isLight ? "#1e293b" : "#e2e8f0",
            display: "flex", alignItems: "center", gap: 8
          }}>
            👥 Current Users ({users.length})
          </div>
          <div style={{ padding: 16 }}>
            {users.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: 20 }}>No users found</div>
            ) : users.map(u => (
              <div key={u.id} style={{
                padding: "12px 16px", marginBottom: 8, borderRadius: 10,
                background: isLight ? "#f8fafc" : "rgba(255,255,255,0.04)",
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0
                  }}>
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isLight ? "#1e293b" : "#e2e8f0" }}>
                      {u.username}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Administrator</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => { setResetUserId(resetUserId === u.id ? null : u.id); setResetPassword(""); setResetConfirm(""); }}
                    style={{
                      padding: "5px 10px", borderRadius: 6, border: "none",
                      background: "rgba(96,165,250,0.2)", color: "#60a5fa",
                      cursor: "pointer", fontSize: 11, fontWeight: 600
                    }}
                  >🔑 Reset</button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.username)}
                    style={{
                      padding: "5px 10px", borderRadius: 6, border: "none",
                      background: "rgba(239,68,68,0.15)", color: "#fca5a5",
                      cursor: "pointer", fontSize: 11, fontWeight: 600
                    }}
                  >🗑️</button>
                </div>
              </div>
            ))}

            {/* Reset Password Form */}
            {resetUserId && (
              <div style={{
                marginTop: 12, padding: 16, borderRadius: 10,
                background: isLight ? "#f0f9ff" : "rgba(96,165,250,0.08)",
                border: isLight ? "1px solid #bae6fd" : "1px solid rgba(96,165,250,0.2)"
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", marginBottom: 10 }}>
                  🔑 Reset Password for: <span style={{ color: isLight ? "#1e293b" : "#e2e8f0" }}>
                    {users.find(u => u.id === resetUserId)?.username}
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 8,
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    background: isLight ? "white" : "rgba(255,255,255,0.05)",
                    color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 12, outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={resetConfirm}
                  onChange={e => setResetConfirm(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, marginBottom: 10,
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                    background: isLight ? "white" : "rgba(255,255,255,0.05)",
                    color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 12, outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleResetPassword(resetUserId)}
                    style={{
                      flex: 1, padding: "8px", borderRadius: 8, border: "none",
                      background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                      color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer"
                    }}
                  >Save Password</button>
                  <button
                    onClick={() => { setResetUserId(null); setResetPassword(""); setResetConfirm(""); }}
                    style={{
                      padding: "8px 14px", borderRadius: 8, border: "none",
                      background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)",
                      color: "#64748b", fontSize: 12, cursor: "pointer"
                    }}
                  >Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== ADD NEW USER ===== */}
        <div style={{
          background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
          border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden", boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
        }}>
          <div style={{
            padding: "14px 20px",
            background: "rgba(16,185,129,0.1)",
            borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
            fontSize: 14, fontWeight: 700, color: isLight ? "#1e293b" : "#e2e8f0",
            display: "flex", alignItems: "center", gap: 8
          }}>
            ➕ Add New User
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                Username
              </div>
              <input
                type="text"
                placeholder="Enter username"
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
                  color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 13, outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                Password
              </div>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
                  color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 13, outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                Confirm Password
              </div>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddUser()}
                style={{
                  width: "100%", padding: "10px 12px", borderRadius: 8,
                  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
                  background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
                  color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 13, outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {/* Password match indicator */}
            {newPassword && confirmPassword && (
              <div style={{
                marginBottom: 14, padding: "8px 12px", borderRadius: 8, fontSize: 12,
                background: newPassword === confirmPassword ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: newPassword === confirmPassword ? "#10b981" : "#ef4444",
                border: `1px solid ${newPassword === confirmPassword ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`
              }}>
                {newPassword === confirmPassword ? "✅ Passwords match" : "❌ Passwords do not match"}
              </div>
            )}

            <button
              onClick={handleAddUser}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: "linear-gradient(90deg, #10b981, #059669)",
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer"
              }}
            >➕ Add User</button>

            {/* Security note */}
            <div style={{
              marginTop: 16, padding: "10px 14px", borderRadius: 8, fontSize: 11,
              background: isLight ? "#fffbeb" : "rgba(245,158,11,0.1)",
              color: isLight ? "#92400e" : "#fbbf24",
              border: isLight ? "1px solid #fde68a" : "1px solid rgba(245,158,11,0.3)"
            }}>
              🔒 Passwords are securely hashed before storing. Users cannot recover plain text passwords.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
