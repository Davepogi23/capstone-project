import { useState, useRef } from "react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["M", "T", "W", "TH", "F", "S", "SU"];

const TIME_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"
];

const INITIAL_SUBJECTS = [
  { id: "s1", code: "CS101", title: "Intro to CS", type: "LEC", units: 3 },
  { id: "s2", code: "CS102", title: "Data Structures", type: "LEC", units: 3 },
  { id: "s3", code: "CS103", title: "Algorithms", type: "LEC", units: 3 },
  { id: "s4", code: "CS104", title: "Web Dev", type: "LAB", units: 2 },
  { id: "s5", code: "MATH101", title: "Calculus I", type: "LEC", units: 3 },
  { id: "s6", code: "ENG101", title: "Tech Writing", type: "LEC", units: 2 },
];

const INITIAL_INSTRUCTORS = [
  { id: "i1", empId: "EMP001", name: "Prof. Santos", dept: "CS" },
  { id: "i2", empId: "EMP002", name: "Prof. Reyes", dept: "CS" },
  { id: "i3", empId: "EMP003", name: "Prof. Cruz", dept: "MATH" },
  { id: "i4", empId: "EMP004", name: "Prof. Garcia", dept: "ENG" },
  { id: "i5", empId: "EMP005", name: "Prof. Lim", dept: "CS" },
];

const SUBJECT_COLORS = [
  "#3B82F6", "#8B5CF6", "#EC4899", "#F97316", "#10B981", "#14B8A6",
  "#F59E0B", "#EF4444", "#6366F1", "#84CC16"
];

export default function ClassScheduler() {
  const [schedule, setSchedule] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [toast, setToast] = useState(null);
  const subjectColors = useRef({});
  let colorIdx = useRef(0);

  const getSubjectColor = (subjectId) => {
    if (!subjectColors.current[subjectId]) {
      subjectColors.current[subjectId] = SUBJECT_COLORS[colorIdx.current % SUBJECT_COLORS.length];
      colorIdx.current++;
    }
    return subjectColors.current[subjectId];
  };

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getCellKey = (dayIdx, timeIdx) => `${dayIdx}-${timeIdx}`;

  const handleCellClick = (dayIdx, timeIdx) => {
    if (!selectedSubject || !selectedInstructor) {
      showToast("Select a subject and instructor first!", "warn");
      return;
    }
    const key = getCellKey(dayIdx, timeIdx);
    if (schedule[key]) {
      showToast("Cell already occupied!", "error");
      return;
    }
    setSchedule(prev => ({
      ...prev,
      [key]: {
        subject: selectedSubject,
        instructor: selectedInstructor,
        day: dayIdx,
        time: timeIdx,
      }
    }));
    showToast(`Scheduled ${selectedSubject.code} in ${DAYS[dayIdx]} ${TIME_SLOTS[timeIdx]}`, "success");
  };

  const handleRemove = (key) => {
    setSchedule(prev => {
      const n = { ...prev };
      delete n[key];
      return n;
    });
  };

  const handleDragStart = (type, item) => {
    setDragItem({ type, item });
  };

  const handleDrop = (dayIdx, timeIdx) => {
    if (!dragItem) return;
    const key = getCellKey(dayIdx, timeIdx);

    if (dragItem.type === "scheduled") {
      const existing = schedule[dragItem.item.key];
      if (!existing) return;
      if (schedule[key]) {
        showToast("Target cell is occupied!", "error");
        setDragItem(null);
        return;
      }
      setSchedule(prev => {
        const n = { ...prev };
        delete n[dragItem.item.key];
        n[key] = { ...existing, day: dayIdx, time: timeIdx };
        return n;
      });
    } else {
      const sub = dragItem.type === "subject" ? dragItem.item : selectedSubject;
      const ins = dragItem.type === "instructor" ? dragItem.item : selectedInstructor;

      if (!sub || !ins) {
        showToast("Select both subject and instructor!", "warn");
        setDragItem(null);
        return;
      }
      if (schedule[key]) {
        showToast("Cell already occupied!", "error");
        setDragItem(null);
        return;
      }
      setSchedule(prev => ({
        ...prev,
        [key]: { subject: sub, instructor: ins, day: dayIdx, time: timeIdx }
      }));
      showToast(`Dropped ${sub.code} → ${DAYS[dayIdx]} ${TIME_SLOTS[timeIdx]}`, "success");
    }
    setDragItem(null);
    setHoveredCell(null);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#e2e8f0",
      padding: "24px",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
          Academic Management System
        </div>
        <h1 style={{
          margin: 0, fontSize: 32, fontWeight: 800,
          background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>
          Class Scheduler
        </h1>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.type === "success" ? "#10b981" : toast.type === "warn" ? "#f59e0b" : "#ef4444",
          color: "white", padding: "10px 18px", borderRadius: 10, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 13,
          animation: "fadeIn 0.2s ease"
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* SCHEDULE GRID */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden",
            backdropFilter: "blur(10px)"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 90, background: "rgba(96,165,250,0.15)" }}>Time</th>
                  {DAYS.map((d, i) => (
                    <th key={i} style={{ ...thStyle, background: "rgba(96,165,250,0.1)" }}>
                      <div style={{ fontWeight: 700 }}>{DAY_SHORT[i]}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 400 }}>{d.slice(0,3)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, tIdx) => (
                  <tr key={tIdx}>
                    <td style={{
                      padding: "6px 8px", fontSize: 11, color: "#94a3b8",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      borderRight: "1px solid rgba(255,255,255,0.08)",
                      textAlign: "center", whiteSpace: "nowrap", fontWeight: 600
                    }}>{time}</td>
                    {DAYS.map((_, dIdx) => {
                      const key = getCellKey(dIdx, tIdx);
                      const entry = schedule[key];
                      const isHovered = hoveredCell === key;
                      const color = entry ? getSubjectColor(entry.subject.id) : null;
                      return (
                        <td
                          key={dIdx}
                          onClick={() => !entry && handleCellClick(dIdx, tIdx)}
                          onDragOver={(e) => { e.preventDefault(); setHoveredCell(key); }}
                          onDragLeave={() => setHoveredCell(null)}
                          onDrop={() => handleDrop(dIdx, tIdx)}
                          style={{
                            padding: 3,
                            border: "1px solid rgba(255,255,255,0.05)",
                            height: 52,
                            minWidth: 90,
                            cursor: entry ? "default" : "pointer",
                            background: isHovered && !entry
                              ? "rgba(96,165,250,0.2)"
                              : entry
                              ? `${color}22`
                              : "transparent",
                            transition: "background 0.15s",
                            verticalAlign: "top",
                            position: "relative"
                          }}
                        >
                          {entry ? (
                            <div
                              draggable
                              onDragStart={() => handleDragStart("scheduled", { key })}
                              style={{
                                background: `${color}33`,
                                border: `1.5px solid ${color}88`,
                                borderLeft: `4px solid ${color}`,
                                borderRadius: 6, padding: "3px 6px",
                                height: "100%", boxSizing: "border-box",
                                cursor: "grab", position: "relative"
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>
                                {entry.subject.code}
                              </div>
                              <div style={{ fontSize: 9, color: "#cbd5e1", lineHeight: 1.2, marginTop: 1 }}>
                                {entry.instructor.name.split(" ")[1]}
                              </div>
                              <div style={{ fontSize: 8, color: "#64748b", lineHeight: 1 }}>
                                {entry.subject.type}
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemove(key); }}
                                style={{
                                  position: "absolute", top: 2, right: 2,
                                  background: "rgba(239,68,68,0.3)", border: "none",
                                  color: "#fca5a5", borderRadius: 3, width: 14, height: 14,
                                  cursor: "pointer", fontSize: 9, lineHeight: 1,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  padding: 0
                                }}
                              >✕</button>
                            </div>
                          ) : (
                            isHovered && (
                              <div style={{
                                position: "absolute", inset: 2,
                                border: "2px dashed rgba(96,165,250,0.6)",
                                borderRadius: 6, display: "flex",
                                alignItems: "center", justifyContent: "center",
                                color: "rgba(96,165,250,0.8)", fontSize: 18
                              }}>+</div>
                            )
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 10, textAlign: "center" }}>
            💡 Click a cell to place • Drag scheduled blocks to move • Drag from panels below
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 200, flexShrink: 0 }}>
          {/* Subjects Panel */}
          <div style={{ ...panelStyle }}>
            <div style={panelHeader("#3b82f6")}>
              <span>📚</span> Subjects
            </div>
            <div style={{ padding: "8px 0" }}>
              {INITIAL_SUBJECTS.map(s => (
                <div
                  key={s.id}
                  draggable
                  onDragStart={() => { handleDragStart("subject", s); setSelectedSubject(s); }}
                  onClick={() => setSelectedSubject(s)}
                  style={{
                    padding: "8px 12px", margin: "3px 8px",
                    borderRadius: 8, cursor: "pointer",
                    background: selectedSubject?.id === s.id
                      ? `${getSubjectColor(s.id)}33`
                      : "rgba(255,255,255,0.03)",
                    border: selectedSubject?.id === s.id
                      ? `1.5px solid ${getSubjectColor(s.id)}88`
                      : "1.5px solid transparent",
                    borderLeft: `4px solid ${getSubjectColor(s.id)}`,
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: getSubjectColor(s.id) }}>{s.code}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8" }}>{s.title}</div>
                  <div style={{ fontSize: 9, color: "#475569", marginTop: 2 }}>
                    {s.type} • {s.units} units
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Instructors Panel */}
          <div style={{ ...panelStyle }}>
            <div style={panelHeader("#8b5cf6")}>
              <span>👨‍🏫</span> Instructors
            </div>
            <div style={{ padding: "8px 0" }}>
              {INITIAL_INSTRUCTORS.map(ins => (
                <div
                  key={ins.id}
                  draggable
                  onDragStart={() => { handleDragStart("instructor", ins); setSelectedInstructor(ins); }}
                  onClick={() => setSelectedInstructor(ins)}
                  style={{
                    padding: "8px 12px", margin: "3px 8px",
                    borderRadius: 8, cursor: "pointer",
                    background: selectedInstructor?.id === ins.id
                      ? "rgba(139,92,246,0.2)"
                      : "rgba(255,255,255,0.03)",
                    border: selectedInstructor?.id === ins.id
                      ? "1.5px solid rgba(139,92,246,0.6)"
                      : "1.5px solid transparent",
                    borderLeft: "4px solid rgba(139,92,246,0.7)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd" }}>{ins.name}</div>
                  <div style={{ fontSize: 9, color: "#64748b" }}>
                    {ins.empId} • {ins.dept}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selection Status */}
          <div style={{
            ...panelStyle, padding: 12,
            background: "rgba(255,255,255,0.03)"
          }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
              Selected
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "#60a5fa" }}>SUBJECT</div>
              <div style={{ fontSize: 11, color: selectedSubject ? "#e2e8f0" : "#475569" }}>
                {selectedSubject ? `${selectedSubject.code} – ${selectedSubject.title}` : "None selected"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#a78bfa" }}>INSTRUCTOR</div>
              <div style={{ fontSize: 11, color: selectedInstructor ? "#e2e8f0" : "#475569" }}>
                {selectedInstructor ? selectedInstructor.name : "None selected"}
              </div>
            </div>
            {selectedSubject && selectedInstructor && (
              <div style={{
                marginTop: 10, padding: "6px 10px", borderRadius: 6,
                background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                fontSize: 10, color: "#6ee7b7", textAlign: "center"
              }}>
                ✓ Ready to schedule
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

const thStyle = {
  padding: "10px 6px", fontSize: 11, fontWeight: 700,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  textAlign: "center", color: "#e2e8f0", letterSpacing: 0.5
};

const panelStyle = {
  background: "rgba(255,255,255,0.04)",
  borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)", overflow: "hidden"
};

const panelHeader = (color) => ({
  padding: "10px 12px",
  background: `${color}22`,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  fontSize: 12, fontWeight: 700, color: "#e2e8f0",
  letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6
});
