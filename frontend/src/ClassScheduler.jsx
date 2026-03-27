import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["M", "T", "W", "TH", "F", "S", "SU"];
const DAY_CODES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const TIME_SLOTS = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM",
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

const API = "http://localhost:3000/api";

export default function ClassScheduler({ theme }) {
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [searchRoom, setSearchRoom] = useState("");
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const isLight = theme === "light";
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [dragItem, setDragItem] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("LEC");
  const [newSubject, setNewSubject] = useState("");
  const [newInstructor, setNewInstructor] = useState("");
  const subjectColors = useRef({});
  const [searchSubject, setSearchSubject] = useState("");
  const [searchInstructor, setSearchInstructor] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState("");
  const [lockChecked, setLockChecked] = useState(false);
  let colorIdx = useRef(0);

  useEffect(() => {
    fetchSubjects();
    fetchInstructors();
    fetchSchedules();
    fetchSections();
    fetchRooms();
    acquireLock();
    window.addEventListener('beforeunload', releaseLock);
    return () => {
      releaseLock();
      window.removeEventListener('beforeunload', releaseLock);
    };
  }, []);

  const fetchSubjects = async () => {
    const res = await fetch(`${API}/subjects`);
    const data = await res.json();
    setSubjects(data);
  };

  const fetchInstructors = async () => {
    const res = await fetch(`${API}/instructors`);
    const data = await res.json();
    setInstructors(data);
  };

  const fetchSchedules = async () => {
    const res = await fetch(`${API}/schedules/draft`);
    const data = await res.json();
    const scheduleMap = {};
    data.forEach(entry => {
      const timeIdx = TIME_SLOTS.findIndex(t => {
        const [timePart, period] = t.split(" ");
        const [hourStr, minuteStr] = timePart.split(":");
        const hour = parseInt(hourStr);
        const minutes = parseInt(minuteStr || "0");
        const isPM = period === "PM";
        const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
        const entryTimeParts = entry.start_time.split(":");
        const entryHour = parseInt(entryTimeParts[0]);
        const entryMinutes = parseInt(entryTimeParts[1] || "0");
        return hour24 === entryHour && minutes === entryMinutes;
      });
      const dayMap = {
        'MON': 0, 'TUE': 1, 'WED': 2, 'THU': 3,
        'FRI': 4, 'SAT': 5, 'SUN': 6,
        'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3,
        'Friday': 4, 'Saturday': 5, 'Sunday': 6
      };
      const dayIdx = dayMap[entry.day] ?? -1;
      if (dayIdx !== -1 && timeIdx !== -1) {
        const key = `${dayIdx}-${timeIdx}`;
        scheduleMap[key] = {
          id: entry.id,
          subject: { id: entry.subject_id, title: entry.subject_title || "Subject" },
          instructor: { id: entry.instructor_id, fullname: entry.instructor_name || "Instructor" },
          room: { id: entry.room_id, room_code: entry.room_code },
          type: entry.class_type,
          section_id: entry.section_id,
          day: dayIdx,
          time: timeIdx,
        };
      }
    });
    setSchedule(scheduleMap);
    setLoading(false);
  };

  const fetchSections = async () => {
    const res = await fetch(`${API}/sections/list`);
    const data = await res.json();
    setSections(data);
  };

  const fetchRooms = async () => {
    const res = await fetch(`${API}/rooms`);
    const data = await res.json();
    setRooms(data);
  };

  const acquireLock = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const res = await fetch(`${API}/lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username })
    });
    const data = await res.json();
    if (data.success) {
      setIsLocked(false);
      setLockedBy("");
    } else {
      if (data.lockedBy === user.username) {
        await fetch(`${API}/lock`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username })
        });
        const res2 = await fetch(`${API}/lock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username })
        });
        const data2 = await res2.json();
        if (data2.success) {
          setIsLocked(false);
          setLockedBy("");
        }
      } else {
        setIsLocked(true);
        setLockedBy(data.lockedBy);
      }
    }
    setLockChecked(true);
  };

  const releaseLock = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    await fetch(`${API}/lock`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username })
    });
  };

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

  const timeToString = (timeIdx) => {
    const time = TIME_SLOTS[timeIdx];
    const [timePart, period] = time.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    const hour = parseInt(hourStr);
    const minutes = minuteStr || "00";
    const isPM = period === "PM";
    const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
    return `${String(hour24).padStart(2, '0')}:${minutes}:00`;
  };

  const handleCellClick = async (dayIdx, timeIdx) => {
    if (!selectedSection) {
      showToast("Please select a section first!", "warn");
      return;
    }
    if (!selectedSubject || !selectedInstructor) {
      showToast("Select a subject and instructor first!", "warn");
      return;
    }
    if (!selectedRoom) {
      showToast("Please select a room first!", "warn");
      return;
    }
    const key = getCellKey(dayIdx, timeIdx);
    if (schedule[key]) {
      showToast("Cell already occupied!", "error");
      return;
    }
    const timeStr = timeToString(timeIdx);
    const day = DAYS[dayIdx];
    const conflictRes = await fetch(
      `${API}/schedules/conflicts?instructor_id=${selectedInstructor.id}&subject_id=${selectedSubject.id}&day=${day}&time=${timeStr}`
    );
    const { instructorConflict, subjectConflict } = await conflictRes.json();
    if (instructorConflict) {
      showToast(`Conflict! ${selectedInstructor.fullname} already has ${instructorConflict.subject_title} at ${day} ${TIME_SLOTS[timeIdx]} (${instructorConflict.section_name})`, "error");
      return;
    }
    if (subjectConflict) {
      showToast(`Conflict! ${selectedSubject.title} is already scheduled at ${day} ${TIME_SLOTS[timeIdx]} (${subjectConflict.section_name})`, "error");
      return;
    }
    try {
      const res = await fetch(`${API}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: selectedSubject.id,
          instructor_id: selectedInstructor.id,
          room_id: selectedRoom?.id || null,
          class_type: selectedType,
          day: DAY_CODES[dayIdx],
          start_time: timeToString(timeIdx),
          section_id: selectedSection?.id
        })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
        return;
      }
      setSchedule(prev => ({
        ...prev,
        [key]: {
          id: data.id,
          subject: selectedSubject,
          instructor: selectedInstructor,
          room: selectedRoom,
          type: selectedType,
          section_id: selectedSection?.id,
          day: dayIdx,
          time: timeIdx,
        }
      }));
      showToast(`Scheduled ${selectedSubject.title}!`, "success");
    } catch (err) {
      showToast("Failed to save schedule!", "error");
    }
  };

  const handleRemove = async (key) => {
    const entry = schedule[key];
    if (!entry) return;
    try {
      await fetch(`${API}/schedules/${entry.id}`, { method: "DELETE" });
      setSchedule(prev => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
      showToast("Schedule removed!", "success");
    } catch (err) {
      showToast("Failed to delete!", "error");
    }
  };

  const handleDragStart = (type, item) => setDragItem({ type, item });

  const handleAddSubject = async () => {
    if (!newSubject.trim()) return;
    const res = await fetch(`${API}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newSubject.trim() })
    });
    const data = await res.json();
    setSubjects(prev => [...prev, data]);
    setNewSubject("");
    showToast("Subject added!", "success");
  };

  const handleDeleteSubject = async (id) => {
    await fetch(`${API}/subjects/${id}`, { method: "DELETE" });
    setSubjects(prev => prev.filter(s => s.id !== id));
    showToast("Subject deleted!", "success");
  };

  const handleAddInstructor = async () => {
    if (!newInstructor.trim()) return;
    const res = await fetch(`${API}/instructors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname: newInstructor.trim() })
    });
    const data = await res.json();
    setInstructors(prev => [...prev, data]);
    setNewInstructor("");
    showToast("Instructor added!", "success");
  };

  const handleDeleteInstructor = async (id) => {
    await fetch(`${API}/instructors/${id}`, { method: "DELETE" });
    setInstructors(prev => prev.filter(i => i.id !== id));
    showToast("Instructor deleted!", "success");
  };

  const handleCreateSchedule = async () => {
    if (!selectedSection) {
      showToast("Please select a section first!", "warn");
      return;
    }
    const scheduledItems = Object.values(schedule);
    if (scheduledItems.length === 0) {
      showToast("Please add subjects to the grid first!", "warn");
      return;
    }
    try {
      const ids = scheduledItems.map(item => item.id);
      await fetch(`${API}/schedules/assign-section`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: selectedSection.id, ids })
      });
      showToast("Schedule created successfully! 🎉", "success");
      setSchedule({});
      setSelectedSection(null);
      setTimeout(() => { navigate("/schedules"); }, 1500);
    } catch (err) {
      showToast("Failed to create schedule!", "error");
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear everything? This will delete all unsaved schedules!")) return;
    const draftItems = Object.values(schedule);
    await Promise.all(draftItems.map(item =>
      fetch(`${API}/schedules/${item.id}`, { method: "DELETE" })
    ));
    setSchedule({});
    setSelectedSection(null);
    showToast("Cleared!", "success");
  };

  const handleDrop = async (dayIdx, timeIdx, e) => {
    if (!dragItem) return;
    if (!selectedSection) {
      showToast("Please select a section first!", "warn");
      setDragItem(null);
      return;
    }
    const key = getCellKey(dayIdx, timeIdx);
    const isCopy = e?.ctrlKey || e?.metaKey;
    let sub, ins, entryType;
    if (dragItem.type === "scheduled") {
      const originalEntry = schedule[dragItem.item.key];
      sub = originalEntry?.subject;
      ins = originalEntry?.instructor;
      entryType = originalEntry?.type;
    } else {
      sub = dragItem.type === "subject" ? dragItem.item : selectedSubject;
      ins = dragItem.type === "instructor" ? dragItem.item : selectedInstructor;
      entryType = selectedType;
    }
    if (!sub || !ins) {
      showToast("Select both subject and instructor!", "warn");
      setDragItem(null);
      return;
    }

    if (!selectedRoom) {
      showToast("Please select a room first!", "warn");
      setDragItem(null);
      return;
    }
    
    if (schedule[key]) {
      showToast("Cell already occupied!", "error");
      setDragItem(null);
      return;
    }
    try {
      const res = await fetch(`${API}/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: sub.id,
          instructor_id: ins.id,
          room_id: selectedRoom?.id || null,
          class_type: entryType,
          day: DAY_CODES[dayIdx],
          start_time: timeToString(timeIdx),
          section_id: selectedSection?.id
        })
      });
      const data = await res.json();
      if (data.error) {
        showToast(data.error, "error");
        setDragItem(null);
        return;
      }
      if (!isCopy && dragItem.type === "scheduled") {
        const oldEntry = schedule[dragItem.item.key];
        if (oldEntry) {
          await fetch(`${API}/schedules/${oldEntry.id}`, { method: "DELETE" });
          setSchedule(prev => {
            const n = { ...prev };
            delete n[dragItem.item.key];
            n[key] = { id: data.id, subject: sub, instructor: ins, type: entryType, section_id: selectedSection?.id, day: dayIdx, time: timeIdx };
            return n;
          });
          showToast(`Moved ${sub.title}!`, "success");
        }
      } else {
        setSchedule(prev => ({
          ...prev,
          [key]: { id: data.id, subject: sub, instructor: ins, type: entryType, section_id: selectedSection?.id, day: dayIdx, time: timeIdx }
        }));
        showToast(isCopy ? `Copied ${sub.title}! 📋` : `Dropped ${sub.title}!`, "success");
      }
    } catch (err) {
      showToast("Failed to save!", "error");
    }
    setDragItem(null);
    setHoveredCell(null);
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
      color: isLight ? "#1e293b" : "#e2e8f0", padding: "24px", boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
          Web Based Class Scheduling for ACLC
        </div>
        <h1 style={{
          margin: "0 0 16px", fontSize: 32, fontWeight: 800,
          background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>Class Scheduler</h1>

        {/* Section Dropdown */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: isLight ? "white" : "rgba(255,255,255,0.05)",
            border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "10px 16px", width: 400
          }}>
            <span style={{ fontSize: 16 }}>🏫</span>
            <select
              value={selectedSection?.id || ""}
              onChange={e => {
                const sec = sections.find(s => s.id === parseInt(e.target.value));
                setSelectedSection(sec || null);
              }}
              style={{
                flex: 1, background: "transparent", border: "none",
                color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 13, outline: "none",
                fontFamily: "'Segoe UI', sans-serif", cursor: "pointer"
              }}
            >
              <option value="">Select a section...</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}
                  style={{ background: isLight ? "white" : "#1e293b", color: isLight ? "#1e293b" : "#e2e8f0" }}>
                  {s.section_name}
                </option>
              ))}
            </select>
            {selectedSection && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#60a5fa",
                background: "rgba(96,165,250,0.15)",
                padding: "3px 8px", borderRadius: 20,
                border: "1px solid rgba(96,165,250,0.3)"
              }}>{selectedSection.section_name}</span>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 999,
          background: toast.type === "success" ? "#10b981" : toast.type === "warn" ? "#f59e0b" : "#ef4444",
          color: "white", padding: "10px 18px", borderRadius: 10, fontWeight: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", fontSize: 13
        }}>{toast.msg}</div>
      )}

      {/* Lock Banner */}
      {lockChecked && isLocked && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 998,
          background: "rgba(239,68,68,0.95)", padding: "14px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
        }}>
          <span style={{ fontSize: 20 }}>🔒</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Scheduler is currently locked</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)" }}>
              <strong>{lockedBy}</strong> is currently editing. You can view but not make changes.
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* SCHEDULE GRID */}
        <div style={{ flex: 1, overflowX: "auto" }}>
          <div style={{
            background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 16,
            border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)", overflow: "hidden"
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
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
                        <td key={dIdx}
                          onClick={() => !entry && !isLocked && handleCellClick(dIdx, tIdx)}
                          onDragOver={(e) => { e.preventDefault(); setHoveredCell(key); }}
                          onDragLeave={() => setHoveredCell(null)}
                          onDrop={(e) => !isLocked && handleDrop(dIdx, tIdx, e)}
                          style={{
                            padding: 3, border: "1px solid rgba(255,255,255,0.05)",
                            height: 52, minWidth: 90,
                            cursor: entry ? "default" : "pointer",
                            background: isHovered && !entry ? "rgba(96,165,250,0.2)" : entry ? `${color}22` : "transparent",
                            transition: "background 0.15s", verticalAlign: "top", position: "relative"
                          }}>
                          {entry ? (
                            <div draggable onDragStart={() => handleDragStart("scheduled", { key })}
                              style={{
                                background: `${color}33`, border: `1.5px solid ${color}88`,
                                borderLeft: `4px solid ${color}`, borderRadius: 6,
                                padding: "3px 6px", height: "100%", boxSizing: "border-box",
                                cursor: "grab", position: "relative"
                              }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>
                                {entry.subject.title}
                              </div>
                              <div style={{ fontSize: 9, color: isLight ? "#475569" : "#cbd5e1", lineHeight: 1.2, marginTop: 1 }}>
                                {entry.instructor.fullname}
                              </div>
                              <div style={{ fontSize: 8, fontWeight: 700, marginTop: 2, color: entry.type === "LAB" ? "#f472b6" : "#60a5fa" }}>
                                {entry.type || "LEC"}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleRemove(key); }}
                                style={{
                                  position: "absolute", top: 2, right: 2,
                                  background: "rgba(239,68,68,0.3)", border: "none",
                                  color: "#fca5a5", borderRadius: 3, width: 14, height: 14,
                                  cursor: "pointer", fontSize: 9, lineHeight: 1,
                                  display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                                }}>✕</button>
                            </div>
                          ) : (
                            isHovered && (
                              <div style={{
                                position: "absolute", inset: 2,
                                border: "2px dashed rgba(96,165,250,0.6)", borderRadius: 6,
                                display: "flex", alignItems: "center", justifyContent: "center",
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
            💡 Click a cell to place • Drag scheduled blocks to move • Ctrl+drag to copy
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: 200, flexShrink: 0 }}>

          {/* Subjects Panel */}
          <div style={{ ...panelStyle(isLight) }}>
            <div style={panelHeader("#3b82f6")}><span>📚</span> Subjects</div>
            <div style={{ padding: "8px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <input placeholder="Add subject..." value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddSubject()}
                  style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 11, outline: "none" }} />
                <button onClick={handleAddSubject} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "rgba(96,165,250,0.3)", color: "#60a5fa", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
              </div>
              <input placeholder="🔍 Search..." value={searchSubject}
                onChange={e => setSearchSubject(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {subjects.filter(s => s.title.toLowerCase().includes(searchSubject.toLowerCase())).map(s => (
                  <div key={s.id} draggable
                    onDragStart={() => { handleDragStart("subject", s); setSelectedSubject(s); }}
                    onClick={() => setSelectedSubject(s)}
                    style={{
                      padding: "8px 12px", margin: "3px 0", borderRadius: 8, cursor: "pointer",
                      background: selectedSubject?.id === s.id ? `${getSubjectColor(s.id)}33` : "rgba(255,255,255,0.03)",
                      border: selectedSubject?.id === s.id ? `1.5px solid ${getSubjectColor(s.id)}88` : "1.5px solid transparent",
                      borderLeft: `4px solid ${getSubjectColor(s.id)}`, transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: getSubjectColor(s.id) }}>{s.title}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSubject(s.id); }}
                      style={{ background: "rgba(239,68,68,0.2)", border: "none", color: "#fca5a5", borderRadius: 3, width: 16, height: 16, cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instructors Panel */}
          <div style={{ ...panelStyle(isLight) }}>
            <div style={panelHeader("#8b5cf6")}><span>👨‍🏫</span> Instructors</div>
            <div style={{ padding: "8px" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <input placeholder="Add instructor..." value={newInstructor}
                  onChange={e => setNewInstructor(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddInstructor()}
                  style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 11, outline: "none" }} />
                <button onClick={handleAddInstructor} style={{ padding: "6px 10px", borderRadius: 6, border: "none", background: "rgba(139,92,246,0.3)", color: "#a78bfa", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
              </div>
              <input placeholder="🔍 Search..." value={searchInstructor}
                onChange={e => setSearchInstructor(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {instructors.filter(i => i.fullname.toLowerCase().includes(searchInstructor.toLowerCase())).map(ins => (
                  <div key={ins.id} draggable
                    onDragStart={() => { handleDragStart("instructor", ins); setSelectedInstructor(ins); }}
                    onClick={() => setSelectedInstructor(ins)}
                    style={{
                      padding: "8px 12px", margin: "3px 0", borderRadius: 8, cursor: "pointer",
                      background: selectedInstructor?.id === ins.id ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.03)",
                      border: selectedInstructor?.id === ins.id ? "1.5px solid rgba(139,92,246,0.6)" : "1.5px solid transparent",
                      borderLeft: "4px solid rgba(139,92,246,0.7)", transition: "all 0.15s",
                      display: "flex", alignItems: "center", justifyContent: "space-between"
                    }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? "#7c3aed" : "#c4b5fd" }}>{ins.fullname}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteInstructor(ins.id); }}
                      style={{ background: "rgba(239,68,68,0.2)", border: "none", color: "#fca5a5", borderRadius: 3, width: 16, height: 16, cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rooms Panel */}
          <div style={{ ...panelStyle(isLight) }}>
            <div style={panelHeader("#10b981")}><span>🚪</span> Rooms</div>
            <div style={{ padding: "8px" }}>
              <input placeholder="🔍 Search room..." value={searchRoom}
                onChange={e => setSearchRoom(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, marginBottom: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: isLight ? "#1e293b" : "#e2e8f0", fontSize: 11, outline: "none", boxSizing: "border-box" }} />
              <div style={{ maxHeight: 160, overflowY: "auto" }}>
                {rooms.filter(r => r.room_code.toLowerCase().includes(searchRoom.toLowerCase())).map(r => (
                  <div key={r.id} onClick={() => {
  const newRoom = selectedRoom?.id === r.id ? null : r;
  setSelectedRoom(newRoom);
  if (newRoom) {
    const isSlab = newRoom.room_code.toLowerCase().includes('slab');
    setSelectedType(isSlab ? 'LAB' : 'LEC');
  }
}}
                    style={{
                      padding: "8px 12px", margin: "3px 0", borderRadius: 8, cursor: "pointer",
                      background: selectedRoom?.id === r.id ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.03)",
                      border: selectedRoom?.id === r.id ? "1.5px solid rgba(16,185,129,0.6)" : "1.5px solid transparent",
                      borderLeft: "4px solid rgba(16,185,129,0.7)", transition: "all 0.15s",
                    }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isLight ? "#059669" : "#6ee7b7" }}>{r.room_code}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selection Status */}
          <div style={{ ...panelStyle(isLight), padding: 12 }}>
            <div style={{ fontSize: 10, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Selected</div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "#60a5fa" }}>SUBJECT</div>
              <div style={{ fontSize: 11, color: selectedSubject ? (isLight ? "#1e293b" : "#e2e8f0") : "#475569" }}>
                {selectedSubject ? selectedSubject.title : "None selected"}
              </div>
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "#a78bfa" }}>INSTRUCTOR</div>
              <div style={{ fontSize: 11, color: selectedInstructor ? (isLight ? "#1e293b" : "#e2e8f0") : "#475569" }}>
                {selectedInstructor ? selectedInstructor.fullname : "None selected"}
              </div>
            </div>
            <div style={{ marginBottom: 6 }}>
              <div style={{ fontSize: 9, color: "#6ee7b7" }}>ROOM</div>
              <div style={{ fontSize: 11, color: selectedRoom ? (isLight ? "#1e293b" : "#e2e8f0") : "#475569" }}>
                {selectedRoom ? selectedRoom.room_code : "None selected"}
              </div>
            </div>
            {(selectedSubject && selectedInstructor) || Object.keys(schedule).length > 0 ? (
              <>
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 9, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Type</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {["LEC", "LAB"].map(t => (
                      <button key={t} onClick={() => setSelectedType(t)} style={{
                        flex: 1, padding: "6px 0", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700,
                        background: selectedType === t ? t === "LEC" ? "rgba(96,165,250,0.3)" : "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.05)",
                        color: selectedType === t ? t === "LEC" ? "#60a5fa" : "#f472b6" : "#64748b",
                        border: selectedType === t ? t === "LEC" ? "1px solid rgba(96,165,250,0.5)" : "1px solid rgba(236,72,153,0.5)" : "1px solid transparent",
                        transition: "all 0.15s"
                      }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: "6px 10px", borderRadius: 6, background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", fontSize: 10, color: "#6ee7b7", textAlign: "center" }}>
                  ✓ Ready to schedule
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={handleClear} disabled={isLocked} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)",
                    background: isLocked ? "rgba(255,255,255,0.05)" : "rgba(239,68,68,0.15)",
                    color: isLocked ? "#475569" : "#fca5a5", fontSize: 12, fontWeight: 700,
                    cursor: isLocked ? "not-allowed" : "pointer", transition: "all 0.2s"
                  }}>🗑️ Clear</button>
                  <button onClick={handleCreateSchedule} disabled={isLocked} style={{
                    flex: 2, padding: "10px", borderRadius: 8, border: "none",
                    cursor: isLocked ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700,
                    background: isLocked ? "rgba(255,255,255,0.05)" : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                    color: isLocked ? "#475569" : "white", transition: "all 0.2s"
                  }}>+ Create Schedule</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 6px", fontSize: 11, fontWeight: 700,
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  textAlign: "center", color: "#e2e8f0", letterSpacing: 0.5
};

const panelStyle = (isLight) => ({
  background: isLight ? "white" : "rgba(255,255,255,0.04)", borderRadius: 12,
  border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)", overflow: "hidden",
  boxShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
});

const panelHeader = (color) => ({
  padding: "10px 12px", background: `${color}22`,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  fontSize: 12, fontWeight: 700, color: "#e2e8f0",
  letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6
});