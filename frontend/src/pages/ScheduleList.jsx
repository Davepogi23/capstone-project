import { useState, useEffect, useRef } from "react";

const API = "http://localhost:3000/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["M", "T", "W", "TH", "F", "S"];
const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

const TIME_SLOTS = [
  "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM", "8:00 PM", "8:30 PM",
  "9:00 PM"
];

const SUBJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#10B981", "#14B8A6",
  "#F59E0B", "#EF4444", "#6366F1", "#84CC16"
];

const formatTimeShort = (t) => {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr);
  const m = mStr || "00";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m}`;
};

const groupSchedulesForTable = (schedules) => {
  const groups = {};
  schedules.forEach(s => {
    const key = `${s.subject_id}-${s.instructor_id}-${s.room_id}-${s.class_type}-${s.class_no || ""}`;
    if (!groups[key]) {
      groups[key] = { ...s, days: [s.day], ids: [s.id] };
    } else {
      if (!groups[key].days.includes(s.day)) groups[key].days.push(s.day);
      groups[key].ids.push(s.id);
      if (s.start_time < groups[key].start_time) groups[key].start_time = s.start_time;
      if (s.end_time > groups[key].end_time) groups[key].end_time = s.end_time;
    }
  });
  const dayOrder = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  return Object.values(groups).map(g => ({
    ...g,
    daysFormatted: g.days
      .sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))
      .join("/")
  })).sort((a, b) => a.start_time.localeCompare(b.start_time));
};

export default function ScheduleList({ theme }) {
  const isLight = theme === "light";
  const [sections, setSections] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [printMode, setPrintMode] = useState(null);
  const [toast, setToast] = useState(null);
  const colorMap = useRef({});
  const colorIdx = useRef(0);

  const getColor = (id) => {
    if (!colorMap.current[id]) {
      colorMap.current[id] = SUBJECT_COLORS[colorIdx.current % SUBJECT_COLORS.length];
      colorIdx.current++;
    }
    return colorMap.current[id];
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    setLoading(true);
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

  const handleDeleteSection = async (sectionId, sectionName) => {
    if (!confirm(`Delete all schedules for ${sectionName}?`)) return;
    const toDelete = schedules.filter(s => s.section_id === sectionId);
    await Promise.all(toDelete.map(s =>
      fetch(`${API}/schedules/${s.id}`, { method: "DELETE" })
    ));
    setSections(prev => prev.filter(s => s.section_id !== sectionId));
    setSchedules(prev => prev.filter(s => s.section_id !== sectionId));
    if (selectedSection?.section_id === sectionId) setSelectedSection(null);
  };

  // Delete a single schedule entry by ID
  const handleDeleteEntry = async (ids) => {
    if (!confirm("Remove this schedule entry?")) return;
    await Promise.all(ids.map(id =>
      fetch(`${API}/schedules/${id}`, { method: "DELETE" })
    ));
    setSchedules(prev => prev.filter(s => !ids.includes(s.id)));
    showToast("Entry removed!", "success");
  };

  const handlePrint = (mode) => {
    setPrintMode(mode);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintMode(null), 500);
    }, 300);
  };

  const sectionSchedules = selectedSection
    ? schedules.filter(s => s.section_id === selectedSection.section_id)
    : [];

  const tableRows = groupSchedulesForTable(sectionSchedules);

  const timeIdxToStr = (timeIdx) => {
    const time = TIME_SLOTS[timeIdx];
    const [timePart, period] = time.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    const hour = parseInt(hourStr);
    const isPM = period === "PM";
    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    return `${String(hour24).padStart(2, '0')}:${minuteStr || "00"}`;
  };

  // Find the schedule block that starts at this cell
  const getBlockAt = (dayIdx, timeIdx) => {
    const dayCode = DAY_CODES[dayIdx];
    const timeStr = timeIdxToStr(timeIdx);
    return sectionSchedules.find(s =>
      s.day === dayCode && s.start_time && s.start_time.startsWith(timeStr)
    );
  };

  // Check if this cell is inside a block (not the start)
  const isInsideBlock = (dayIdx, timeIdx) => {
    const dayCode = DAY_CODES[dayIdx];
    const slotTime = timeIdxToStr(timeIdx);
    return sectionSchedules.some(s => {
      if (s.day !== dayCode) return false;
      // Convert start_time and end_time to slot indices
      const startIdx = TIME_SLOTS.findIndex((_, idx) => timeIdxToStr(idx) === s.start_time.slice(0,5));
      const endIdx = TIME_SLOTS.findIndex((_, idx) => timeIdxToStr(idx) === s.end_time.slice(0,5));
      return startIdx !== -1 && endIdx !== -1 && timeIdx > startIdx && timeIdx <= endIdx;
    });
  };

  const hasContent = (timeIdx) => DAYS.some((_, dIdx) => getBlockAt(dIdx, timeIdx) || isInsideBlock(dIdx, timeIdx));

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
      color: isLight ? "#1e293b" : "#e2e8f0"
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

      <div style={{ flex: 1, padding: 32 }}>

        {/* ===== SECTIONS LIST ===== */}
        {!selectedSection ? (
          <>
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, letterSpacing: 4, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                Web Based Class Scheduling for ACLC
              </div>
              <h1 style={{
                margin: 0, fontSize: 28, fontWeight: 800,
                background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
              }}>Schedules List</h1>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {sections.length} section{sections.length !== 1 ? "s" : ""} total
              </div>
            </div>

            {sections.length === 0 ? (
              <div style={{
                background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                padding: 60, textAlign: "center", color: "#475569"
              }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 16, marginBottom: 8 }}>No schedules yet</div>
                <div style={{ fontSize: 13 }}>Go to the Scheduler, select a section and create schedules!</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {sections.map(sec => (
                  <div key={sec.section_id} style={{
                    background: isLight ? "white" : "rgba(255,255,255,0.04)",
                    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 16, padding: 20, transition: "all 0.2s",
                    borderLeft: "4px solid #60a5fa",
                    boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: isLight ? "#1e293b" : "#e2e8f0", marginBottom: 4 }}>
                          {sec.section}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                          Created: {new Date(sec.created_at + 'Z').toLocaleDateString('en-PH')}{" "}
                          {new Date(sec.created_at + 'Z').toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSection(sec.section_id, sec.section); }}
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
                      onClick={() => setSelectedSection(sec)}
                      style={{
                        width: "100%", padding: "10px", borderRadius: 8, border: "none",
                        background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                        color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer"
                      }}
                    >View Schedule →</button>
                  </div>
                ))}
              </div>
            )}
          </>

        ) : (
          <>
            {/* ===== SCHEDULE VIEW HEADER ===== */}
            <div className="no-print" style={{ marginBottom: 20, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <div>
                <button
                  onClick={() => setSelectedSection(null)}
                  style={{
                    background: isLight ? "#f1f5f9" : "rgba(255,255,255,0.05)", border: "none",
                    color: "#94a3b8", padding: "8px 14px", borderRadius: 8,
                    cursor: "pointer", fontSize: 12, marginBottom: 12
                  }}
                >← Back to Sections</button>
                <h1 style={{
                  margin: 0, fontSize: 28, fontWeight: 800,
                  background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
                }}>{selectedSection.section}</h1>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {sectionSchedules.length} subjects scheduled
                </div>
              </div>

              {/* Print Buttons */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={() => handlePrint('grid')} style={{
                  padding: "12px 20px", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}>🗓️ Print Grid View</button>
                <button onClick={() => handlePrint('table')} style={{
                  padding: "12px 20px", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #10b981, #059669)",
                  color: "white", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8
                }}>📋 Print Table View</button>
              </div>
            </div>

            {/* ===== GRID VIEW ===== */}
            <div className={`print-area-grid${printMode === 'table' ? ' hide-on-print' : ''}`} style={{
              background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
              border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden", marginBottom: 24,
              boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}>
              <div className="print-only-grid" style={{ display: "none", textAlign: "center", padding: "16px 0 8px" }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Class Schedule — {selectedSection.section}</h2>
                <p style={{ margin: "4px 0", fontSize: 11, color: "#666" }}>Printed on {new Date().toLocaleDateString('en-PH')}</p>
              </div>
              {sectionSchedules.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
                  <div>No schedules found.</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle(isLight), width: 90, background: "rgba(96,165,250,0.15)" }}>Time</th>
                      {DAYS.map((d, i) => (
                        <th key={i} style={{ ...thStyle(isLight), background: "rgba(96,165,250,0.1)" }}>
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
                            padding: "6px 8px", fontSize: 11,
                            color: isLight ? "#475569" : "#94a3b8",
                            borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)",
                            borderRight: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
                            textAlign: "center", whiteSpace: "nowrap", fontWeight: 600
                          }}>{time}</td>
                          {DAYS.map((_, dIdx) => {
                            // If this cell is inside a block (not the start), skip rendering (so rowSpan works)
                            if (isInsideBlock(dIdx, tIdx)) return null;
                            const entry = getBlockAt(dIdx, tIdx);
                            if (entry) {
                              // Calculate rowSpan (number of slots this block covers)
                              const startIdx = TIME_SLOTS.findIndex((_, idx) => timeIdxToStr(idx) === entry.start_time.slice(0,5));
                              const endIdx = TIME_SLOTS.findIndex((_, idx) => timeIdxToStr(idx) === entry.end_time.slice(0,5));
                              const rowSpan = endIdx > startIdx ? endIdx - startIdx + 1 : 1;
                              const color = getColor(entry.subject_id);
                              return (
                                <td key={dIdx} rowSpan={rowSpan} style={{
                                  padding: 3,
                                  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)",
                                  height: 60 * rowSpan, minWidth: 100, verticalAlign: "top",
                                  background: `${color}22`
                                }}>
                                  <div style={{
                                    background: `${color}33`,
                                    border: `1.5px solid ${color}88`,
                                    borderLeft: `4px solid ${color}`,
                                    borderRadius: 6, padding: "4px 6px",
                                    height: "100%", boxSizing: "border-box",
                                    position: "relative"
                                  }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>{entry.subject_title}</div>
                                    <div style={{ fontSize: 9, color: isLight ? "#475569" : "#cbd5e1", lineHeight: 1.2, marginTop: 1 }}>{entry.instructor_name}</div>
                                    {entry.room_code && (
                                      <div style={{ fontSize: 8, color: "#94a3b8", marginTop: 1 }}>🚪 {entry.room_code}</div>
                                    )}
                                    <div style={{
                                      fontSize: 8, fontWeight: 700, marginTop: 2,
                                      color: entry.class_type === "LAB" ? "#f472b6" : "#60a5fa"
                                    }}>{entry.class_type || "LEC"}</div>
                                    {/* Delete button on grid cell */}
                                    <button
                                      className="no-print"
                                      onClick={() => handleDeleteEntry([entry.id])}
                                      style={{
                                        position: "absolute", top: 2, right: 2,
                                        background: "rgba(239,68,68,0.3)", border: "none",
                                        color: "#fca5a5", borderRadius: 3,
                                        width: 14, height: 14, cursor: "pointer",
                                        fontSize: 9, lineHeight: 1,
                                        display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                                      }}>✕</button>
                                  </div>
                                </td>
                              );
                            }
                            // Empty cell
                            return (
                              <td key={dIdx} style={{
                                padding: 3,
                                border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.05)",
                                height: 60, minWidth: 100, verticalAlign: "top",
                                background: "transparent"
                              }} />
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* ===== TABLE VIEW ===== */}
            <div className={`print-area-table${printMode === 'grid' ? ' hide-on-print' : ''}`} style={{
              background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
              border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.08)",
              overflow: "hidden",
              boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}>
              <div className="no-print" style={{ padding: "14px 20px", borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: isLight ? "#1e293b" : "#e2e8f0" }}>
                  📋 {selectedSection.section} — Official Schedule Table
                  <span style={{ fontSize: 11, fontWeight: 400, color: "#64748b", marginLeft: 10 }}>
                    Click 🗑️ to remove a wrong entry
                  </span>
                </div>
              </div>
              <div className="print-only-table" style={{ display: "none", padding: "16px 20px 8px" }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{selectedSection.section}</h2>
                <p style={{ margin: "4px 0", fontSize: 11, color: "#666" }}>Printed on {new Date().toLocaleDateString('en-PH')}</p>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: isLight ? "#f1f5f9" : "rgba(96,165,250,0.15)" }}>
                      {["SUBJECT CODE", "SUBJECT TITLE", "TIME", "DAYS", "ROOM", "INSTRUCTOR", "CLASS NO.", ""].map((col, i) => (
                        <th key={i} style={{
                          padding: "10px 12px",
                          border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.1)",
                          textAlign: "left", fontWeight: 700, fontSize: 11,
                          color: isLight ? "#1e293b" : "#e2e8f0", whiteSpace: "nowrap",
                          // Hide the last column (delete) when printing
                          ...(i === 7 ? { display: "table-cell" } : {})
                        }}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>No schedules found.</td>
                      </tr>
                    ) : tableRows.map((row, i) => (
                      <tr key={i} style={{
                        background: i % 2 === 0
                          ? (isLight ? "white" : "transparent")
                          : (isLight ? "#f8fafc" : "rgba(255,255,255,0.02)")
                      }}>
                        <td style={tdStyle(isLight)}>{row.subject_code || "—"}</td>
                        <td style={tdStyle(isLight)}>
                          {row.subject_title}
                          {row.class_type && (
                            <span style={{
                              marginLeft: 6, fontSize: 9, fontWeight: 700,
                              padding: "1px 5px", borderRadius: 4,
                              background: row.class_type === "LAB" ? "rgba(244,114,182,0.2)" : "rgba(96,165,250,0.2)",
                              color: row.class_type === "LAB" ? "#f472b6" : "#60a5fa"
                            }}>{row.class_type}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle(isLight), whiteSpace: "nowrap" }}>
                          {formatTimeShort(row.start_time)}–{formatTimeShort(row.end_time)}
                        </td>
                        <td style={{ ...tdStyle(isLight), whiteSpace: "nowrap" }}>{row.daysFormatted}</td>
                        <td style={tdStyle(isLight)}>{row.room_code || "—"}</td>
                        <td style={tdStyle(isLight)}>{row.instructor_name || "—"}</td>
                        <td style={{ ...tdStyle(isLight), textAlign: "center", fontWeight: 700, color: "#60a5fa" }}>
                          {row.class_no || "—"}
                        </td>
                        {/* Delete button — hidden when printing */}
                        <td className="no-print" style={{ ...tdStyle(isLight), textAlign: "center", padding: "4px 8px" }}>
                          <button
                            onClick={() => handleDeleteEntry(row.ids)}
                            title="Remove this entry"
                            style={{
                              background: "rgba(239,68,68,0.15)", border: "none",
                              color: "#fca5a5", borderRadius: 6, padding: "4px 8px",
                              cursor: "pointer", fontSize: 11, fontWeight: 600
                            }}
                          >🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          /* Force white background always regardless of theme */
          body, html { background: white !important; color: black !important; }
          body * { visibility: hidden; }

          /* Grid print */
          .print-area-grid, .print-area-grid * { visibility: visible; }
          .print-area-grid {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100% !important; background: white !important;
            color: black !important; border: 1px solid #ccc !important;
            border-radius: 0 !important;
          }
          .print-only-grid { display: block !important; }

          /* Table print */
          .print-area-table, .print-area-table * { visibility: visible; }
          .print-area-table {
            position: fixed !important; top: 0 !important; left: 0 !important;
            width: 100% !important; background: white !important;
            color: black !important; border: 1px solid #ccc !important;
            border-radius: 0 !important;
          }
          .print-only-table { display: block !important; }

          /* Hide delete buttons and non-print elements */
          .hide-on-print { display: none !important; visibility: hidden !important; }
          .no-print { display: none !important; }

          /* Force table borders visible on print */
          table, th, td { border: 1px solid #ccc !important; color: black !important; }
          th { background: #f0f0f0 !important; }

          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}

const thStyle = (isLight) => ({
  padding: "10px 6px", fontSize: 11, fontWeight: 700,
  borderBottom: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.1)",
  border: isLight ? "1px solid #cbd5e1" : "1px solid rgba(255,255,255,0.08)",
  textAlign: "center", color: isLight ? "#1e293b" : "#e2e8f0", letterSpacing: 0.5
});

const tdStyle = (isLight) => ({
  padding: "9px 12px",
  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)",
  color: isLight ? "#1e293b" : "#e2e8f0",
  verticalAlign: "middle", fontSize: 12
});
