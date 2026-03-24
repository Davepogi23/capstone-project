import { useState, useEffect } from "react";

const API = "http://localhost:3000/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["M", "T", "W", "TH", "F", "S", "SU"];
const TIME_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"
];

const SUBJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#10B981", "#14B8A6",
  "#F59E0B", "#EF4444", "#6366F1", "#84CC16"
];

export default function ScheduleList({ theme }) {
  const isLight = theme === "light";
  const [sections, setSections] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const colorMap = {};
  let colorIdx = 0;

  const getColor = (id) => {
    if (!colorMap[id]) {
      colorMap[id] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    }
    return colorMap[id];
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [sectRes, schRes] = await Promise.all([
      fetch(`${API}/sections`),
      fetch(`${API}/schedules`)
    ]);
    const sectData = await sectRes.json();
    const schData = await schRes.json();
    setSections(sectData);
    setSchedules(schData);
    setLoading(false);
  };

  const handleDeleteSection = async (sectionName) => {
    if (!confirm(`Delete all schedules for ${sectionName}?`)) return;
    const toDelete = schedules.filter(s => s.section === sectionName);
    await Promise.all(toDelete.map(s =>
      fetch(`${API}/schedules/${s.id}`, { method: "DELETE" })
    ));
    setSections(prev => prev.filter(s => s.section !== sectionName));
    setSchedules(prev => prev.filter(s => s.section !== sectionName));
    if (selectedSection === sectionName) setSelectedSection(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const sectionSchedules = schedules.filter(s => s.section === selectedSection);

  const getCell = (dayIdx, timeIdx) => {
    const day = DAYS[dayIdx];
    const timeStr = (() => {
      const time = TIME_SLOTS[timeIdx];
      const hour = parseInt(time);
      const isPM = time.includes("PM");
      const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
      return `${String(hour24).padStart(2, '0')}:00:00`;
    })();
    return sectionSchedules.find(s => s.day === day && s.time === timeStr);
  };

  const hasContent = (timeIdx) => {
    return DAYS.some((_, dIdx) => getCell(dIdx, timeIdx));
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      color: "#e2e8f0", fontSize: 20
    }}>Loading...</div>
  );

  return (
    <div style={{
        minHeight: "100vh",
        background: isLight ? "#f1f5f9" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
        fontFamily: "'Segoe UI', sans-serif",
        color: isLight ? "#1e293b" : "#e2e8f0"
    }}>

      <div style={{ marginLeft: 220, flex: 1, padding: 32, color: isLight ? "#1e293b" : "#e2e8f0" }}>
        {!selectedSection ? (
          <>
            {/* Sections List */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                Academic Management System
              </div>
              <h1 style={{
                margin: 0, fontSize: 28, fontWeight: 800,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>
                Schedules List
              </h1>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {sections.length} section{sections.length !== 1 ? "s" : ""} total
              </div>
            </div>

            {sections.length === 0 ? (
              <div style={{
                background: "rgba(255,255,255,0.04)", borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.08)",
                padding: 60, textAlign: "center", color: "#475569"
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No schedules yet</div>
                <div style={{ fontSize: 13 }}>Go to the Scheduler, enter a section name and create schedules!</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {sections.map(sec => (
                  <div
                    key={sec.section}
                    style={{
                      background: isLight ? "white" : "rgba(255,255,255,0.04)",
                      border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 16, padding: 20, cursor: "pointer",
                      transition: "all 0.2s",
                      borderLeft: "4px solid #60a5fa",
                      boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(96,165,250,0.08)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: "#e2e8f0", marginBottom: 4 }}>
                          {sec.section}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Created: {new Date(sec.created_at + 'Z').toLocaleDateString('en-PH')} {new Date(sec.created_at + 'Z').toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.section); }}
                        style={{
                          background: "rgba(239,68,68,0.15)", border: "none",
                          color: "#fca5a5", borderRadius: 6, padding: "4px 8px",
                          cursor: "pointer", fontSize: 11, fontWeight: 600
                        }}
                      >Delete</button>
                    </div>
                    <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 16 }}>
                      📚 {sec.total_subjects} subject{sec.total_subjects !== 1 ? "s" : ""} scheduled
                    </div>
                    <button
                      onClick={() => setSelectedSection(sec.section)}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, border: "none",
                        background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                        color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}
                    >
                      View Schedule →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Section Grid View */}
            <div className="no-print" style={{ marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <button
                  onClick={() => setSelectedSection(null)}
                  style={{
                    background: "rgba(255,255,255,0.05)", border: "none",
                    color: "#94a3b8", padding: "8px 14px", borderRadius: 8,
                    cursor: "pointer", fontSize: 12, marginBottom: 12
                  }}
                >← Back to Sections</button>
                <h1 style={{
                  margin: 0, fontSize: 28, fontWeight: 800,
                  background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>
                  {selectedSection}
                </h1>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {sectionSchedules.length} subjects scheduled
                </div>
              </div>
              <button
                onClick={handlePrint}
                style={{
                  padding: "12px 24px", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}
              >
                🖨️ Print / Save PDF
              </button>
            </div>

            {/* Print Header - only shows when printing */}
            <div className="print-only" style={{ display: "none", textAlign: "center", marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20 }}>Class Schedule — {selectedSection}</h2>
              <p style={{ margin: "4px 0", fontSize: 12, color: "#666" }}>
                Printed on {new Date().toLocaleDateString()}
              </p>
            </div>

            {/* Schedule Grid */}
            <div className="print-area" style={{
              background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
              border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
              boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 90, background: "rgba(96,165,250,0.15)" }}>Time</th>
                    {DAYS.map((d, i) => (
                      <th key={i} style={{ ...thStyle, background: "rgba(96,165,250,0.1)" }}>
                        <div style={{ fontWeight: 700 }}>{DAY_SHORT[i]}</div>
                        <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 400 }}>{d.slice(0, 3)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time, tIdx) => {
                    if (!hasContent(tIdx)) return null;
                    return (
                      <tr key={tIdx}>
                        <td style={{
                          padding: "6px 8px", fontSize: 11, color: "#94a3b8",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                          borderRight: "1px solid rgba(255,255,255,0.08)",
                          textAlign: "center", whiteSpace: "nowrap", fontWeight: 600
                        }}>{time}</td>
                        {DAYS.map((_, dIdx) => {
                          const entry = getCell(dIdx, tIdx);
                          const color = entry ? getColor(entry.subject_id) : null;
                          return (
                            <td key={dIdx} style={{
                              padding: 3, border: "1px solid rgba(255,255,255,0.05)",
                              height: 60, minWidth: 100, verticalAlign: "top",
                              background: entry ? `${color}22` : "transparent"
                            }}>
                              {entry && (
                                <div style={{
                                  background: `${color}33`,
                                  border: `1.5px solid ${color}88`,
                                  borderLeft: `4px solid ${color}`,
                                  borderRadius: 6, padding: "4px 6px",
                                  height: "100%", boxSizing: "border-box"
                                }}>
                                  <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>
                                    {entry.subject_title}
                                  </div>
                                  <div style={{ fontSize: 9, color: "#cbd5e1", lineHeight: 1.2, marginTop: 1 }}>
                                    {entry.instructor_name}
                                  </div>
                                  <div style={{
                                    fontSize: 8, fontWeight: 700, marginTop: 2,
                                    color: entry.type === "LAB" ? "#f472b6" : "#60a5fa"
                                  }}>
                                    {entry.type}
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: "10px 6px", fontSize: 11, fontWeight: 700,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  textAlign: "center", color: "#e2e8f0", letterSpacing: 0.5
};
