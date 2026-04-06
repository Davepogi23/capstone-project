import { useState, useEffect } from "react";

const API = "http://localhost:3000/api";

const YEAR_LEVELS = [1, 2, 3, 4];
const PROGRAM_TYPES = ["BACHELOR", "DIPLOMA", "OTHER"];
const LEVELS = ["College", "Undergraduate"];

export default function ManageRecords({ theme }) {
  const isLight = theme === "light";

  const [programs, setPrograms] = useState([]);
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [searchProgram, setSearchProgram] = useState("");
  const [searchSection, setSearchSection] = useState("");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchInstructor, setSearchInstructor] = useState("");
  const [searchRoom, setSearchRoom] = useState("");

  // Program form
  const [newProgramCode, setNewProgramCode] = useState("");
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramLevel, setNewProgramLevel] = useState("");
  const [newProgramType, setNewProgramType] = useState("");

  // Section form
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionProgram, setNewSectionProgram] = useState("");
  const [newSectionYear, setNewSectionYear] = useState("");

  // Subject form
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectProgram, setNewSubjectProgram] = useState("");
  const [newSubjectYear, setNewSubjectYear] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");
  const [newSubjectUnits, setNewSubjectUnits] = useState("");

  // Instructor & Room form
  const [newInstructor, setNewInstructor] = useState("");
  const [newRoom, setNewRoom] = useState("");

  const [toast, setToast] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [p, sec, sub, ins, rm] = await Promise.all([
        fetch(`${API}/programs`).then(r => r.json()),
        fetch(`${API}/sections/all`).then(r => r.json()),
        fetch(`${API}/subjects`).then(r => r.json()),
        fetch(`${API}/instructors`).then(r => r.json()),
        fetch(`${API}/rooms`).then(r => r.json()),
      ]);
      setPrograms(Array.isArray(p) ? p : []);
      setSections(Array.isArray(sec) ? sec : []);
      setSubjects(Array.isArray(sub) ? sub : []);
      setInstructors(Array.isArray(ins) ? ins : []);
      setRooms(Array.isArray(rm) ? rm : []);
    } catch (err) {
      showToast("Failed to load data!", "error");
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ===== PROGRAM HANDLERS =====
  const handleAddProgram = async () => {
    if (!newProgramCode.trim() || !newProgramName.trim()) {
      showToast("Program code and name are required!", "error"); return;
    }
    const res = await fetch(`${API}/programs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        program_code: newProgramCode.trim().toUpperCase(),
        program_name: newProgramName.trim(),
        level: newProgramLevel,
        program_type: newProgramType
      })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setNewProgramCode(""); setNewProgramName("");
    setNewProgramLevel(""); setNewProgramType("");
    showToast("Program added! You can now select it in the Sections dropdown.");
    await fetchAll();
  };

  const handleDeleteProgram = async (id, programCode) => {
    const linkedSections = sections.filter(s => s.program_id === id).length;
    const linkedSubjects = subjects.filter(s => s.program_id === id).length;
    let confirmMsg = `Delete program "${programCode}"?`;
    if (linkedSections > 0 || linkedSubjects > 0) {
      confirmMsg += `\n\nThis will also delete:\n- ${linkedSections} section(s)\n- ${linkedSubjects} subject(s)\n\nThis cannot be undone!`;
    }
    if (!confirm(confirmMsg)) return;
    const res = await fetch(`${API}/programs/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setPrograms(prev => prev.filter(p => p.id !== id));
    setSections(prev => prev.filter(s => s.program_id !== id));
    setSubjects(prev => prev.filter(s => s.program_id !== id));
    let msg = "Program deleted!";
    if (data.deletedSections > 0 || data.deletedSubjects > 0) {
      msg += ` Also removed ${data.deletedSections} section(s) and ${data.deletedSubjects} subject(s).`;
    }
    showToast(msg);
  };

  // ===== SECTION HANDLERS =====
  const handleAddSection = async () => {
    if (!newSectionName.trim() || !newSectionProgram || !newSectionYear) {
      showToast("Please fill in all section fields!", "error"); return;
    }
    const res = await fetch(`${API}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section_name: newSectionName.trim().toUpperCase(),
        program_id: parseInt(newSectionProgram),
        year_level: parseInt(newSectionYear)
      })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setNewSectionName(""); setNewSectionProgram(""); setNewSectionYear("");
    showToast("Section added successfully!");
    fetchAll();
  };

  const handleDeleteSection = async (id) => {
    if (!confirm("Delete this section?")) return;
    await fetch(`${API}/sections/${id}`, { method: "DELETE" });
    setSections(prev => prev.filter(s => s.id !== id));
    showToast("Section deleted!");
  };

  // ===== SUBJECT HANDLERS =====
  const handleAddSubject = async () => {
    if (!newSubjectName.trim() || !newSubjectProgram || !newSubjectYear || !newSubjectSemester) {
      showToast("Please fill in all required subject fields!", "error"); return;
    }
    const res = await fetch(`${API}/subjects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_code: newSubjectCode.trim().toUpperCase(),
        subject_name: newSubjectName.trim(),
        program_id: parseInt(newSubjectProgram),
        year_level: parseInt(newSubjectYear),
        semester: parseInt(newSubjectSemester),
        units: parseInt(newSubjectUnits) || 3
      })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setNewSubjectCode(""); setNewSubjectName(""); setNewSubjectProgram("");
    setNewSubjectYear(""); setNewSubjectSemester(""); setNewSubjectUnits("");
    showToast("Subject added successfully!");
    fetchAll();
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm("Delete this subject?")) return;
    await fetch(`${API}/subjects/${id}`, { method: "DELETE" });
    setSubjects(prev => prev.filter(s => s.id !== id));
    showToast("Subject deleted!");
  };

  // ===== INSTRUCTOR HANDLERS =====
  const handleAddInstructor = async () => {
    if (!newInstructor.trim()) { showToast("Please enter instructor name!", "error"); return; }
    const res = await fetch(`${API}/instructors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullname: newInstructor.trim() })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setNewInstructor("");
    showToast("Instructor added successfully!");
    fetchAll();
  };

  const handleDeleteInstructor = async (id) => {
    if (!confirm("Delete this instructor?")) return;
    await fetch(`${API}/instructors/${id}`, { method: "DELETE" });
    setInstructors(prev => prev.filter(i => i.id !== id));
    showToast("Instructor deleted!");
  };

  // ===== ROOM HANDLERS =====
  const handleAddRoom = async () => {
    if (!newRoom.trim()) { showToast("Please enter room code!", "error"); return; }
    const res = await fetch(`${API}/rooms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_code: newRoom.trim().toUpperCase() })
    });
    const data = await res.json();
    if (data.error) { showToast(data.error, "error"); return; }
    setNewRoom("");
    showToast("Room added successfully!");
    fetchAll();
  };

  const handleDeleteRoom = async (id) => {
    if (!confirm("Delete this room?")) return;
    await fetch(`${API}/rooms/${id}`, { method: "DELETE" });
    setRooms(prev => prev.filter(r => r.id !== id));
    showToast("Room deleted!");
  };

  // ===== STYLES =====
  const cardStyle = {
    background: isLight ? "white" : "rgba(255,255,255,0.04)",
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16, overflow: "hidden",
    boxShadow: isLight ? "0 1px 4px rgba(0,0,0,0.06)" : "none"
  };

  const cardHeader = (color) => ({
    padding: "14px 20px",
    background: `${color}22`,
    borderBottom: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)",
    fontSize: 14, fontWeight: 700,
    color: isLight ? "#1e293b" : "#e2e8f0",
    display: "flex", alignItems: "center", gap: 8
  });

  const inputStyle = {
    width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 13,
    border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.1)",
    background: isLight ? "#f8fafc" : "rgba(255,255,255,0.05)",
    color: isLight ? "#1e293b" : "#e2e8f0",
    outline: "none", boxSizing: "border-box"
  };

  const selectStyle = {
    ...inputStyle, cursor: "pointer",
    background: isLight ? "#f8fafc" : "#1e293b",
  };

  const fieldLabel = {
    fontSize: 11, color: "#94a3b8",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5
  };

  const addBtnStyle = (color) => ({
    width: "100%", padding: "9px 18px", borderRadius: 8, border: "none",
    background: `${color}33`, color, fontWeight: 700,
    fontSize: 13, cursor: "pointer"
  });

  const listItemStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: isLight ? "1px solid #f1f5f9" : "1px solid rgba(255,255,255,0.04)",
    fontSize: 13, color: isLight ? "#1e293b" : "#e2e8f0"
  };

  const deleteBtnStyle = {
    background: "rgba(239,68,68,0.15)", border: "none",
    color: "#fca5a5", borderRadius: 6,
    width: 28, height: 28, cursor: "pointer",
    fontSize: 12, display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0
  };

  const searchStyle = {
    ...inputStyle, fontSize: 12, marginBottom: 8
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: isLight ? "#f1f5f9" : "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      fontFamily: "'Segoe UI', sans-serif",
      color: isLight ? "#1e293b" : "#e2e8f0",
      padding: "24px", boxSizing: "border-box"
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
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 11, letterSpacing: 6, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
          Web Based Class Scheduling for ACLC
        </div>
        <h1 style={{
          margin: 0, fontSize: 32, fontWeight: 800,
          background: "linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
        }}>Manage Records</h1>
      </div>

      {/* 3-column top row: Programs spans full, then 2-col grid below */}
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>

        {/* ===== PROGRAMS (full width) ===== */}
        <div style={{ ...cardStyle, marginBottom: 20 }}>
          <div style={cardHeader("#f59e0b")}>
            🎓 Programs <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({programs.length})</span>
          </div>
          <div style={{ padding: 16 }}>
            {/* Add Form */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr 1fr auto", gap: 10, marginBottom: 12, alignItems: "flex-end" }}>
              <div>
                <div style={fieldLabel}>Program Code *</div>
                <input placeholder="e.g. BSED" value={newProgramCode}
                  onChange={e => setNewProgramCode(e.target.value)}
                  style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>Program Name *</div>
                <input placeholder="e.g. Bachelor of Science in Education" value={newProgramName}
                  onChange={e => setNewProgramName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleAddProgram()}
                  style={inputStyle} />
              </div>
              <div>
                <div style={fieldLabel}>Level</div>
                <select value={newProgramLevel} onChange={e => setNewProgramLevel(e.target.value)} style={selectStyle}>
                  <option value="">Select Level</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <div style={fieldLabel}>Type</div>
                <select value={newProgramType} onChange={e => setNewProgramType(e.target.value)} style={selectStyle}>
                  <option value="">Select Type</option>
                  {PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <button onClick={handleAddProgram} style={{ ...addBtnStyle("#f59e0b"), width: "auto", padding: "9px 20px", alignSelf: "flex-end" }}>
                + Add
              </button>
            </div>
            {/* Search */}
            <input placeholder="🔍 Search programs..." value={searchProgram}
              onChange={e => setSearchProgram(e.target.value)} style={searchStyle} />
            {/* List */}
            <div style={{ borderRadius: 8, border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)" }}>
              {programs.filter(p =>
                p.program_code?.toLowerCase().includes(searchProgram.toLowerCase()) ||
                p.program_name?.toLowerCase().includes(searchProgram.toLowerCase())
              ).length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>No programs found</div>
              ) : programs.filter(p =>
                p.program_code?.toLowerCase().includes(searchProgram.toLowerCase()) ||
                p.program_name?.toLowerCase().includes(searchProgram.toLowerCase())
              ).map(p => (
                <div key={p.id} style={{ ...listItemStyle, display: "grid", gridTemplateColumns: "80px 1fr 120px 100px auto", gap: 12, alignItems: "center" }}>
                  <span style={{ fontWeight: 700, color: isLight ? "#d97706" : "#fbbf24" }}>{p.program_code}</span>
                  <span style={{ fontSize: 12 }}>{p.program_name}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{p.level}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textAlign: "center",
                    background: p.program_type === "BACHELOR" ? "rgba(96,165,250,0.15)" : p.program_type === "DIPLOMA" ? "rgba(167,139,250,0.15)" : "rgba(16,185,129,0.15)",
                    color: p.program_type === "BACHELOR" ? "#60a5fa" : p.program_type === "DIPLOMA" ? "#a78bfa" : "#6ee7b7"
                  }}>{p.program_type}</span>
                  <button onClick={() => handleDeleteProgram(p.id, p.program_code)} style={deleteBtnStyle}>✕</button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2-column grid for the rest */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

          {/* ===== SECTIONS ===== */}
          <div style={cardStyle}>
            <div style={cardHeader("#3b82f6")}>
              🏫 Sections <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({sections.length})</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={fieldLabel}>Section Name *</div>
                  <input placeholder="e.g. BSIT 1-A" value={newSectionName}
                    onChange={e => setNewSectionName(e.target.value)}
                    style={inputStyle} />
                </div>
                <div>
                  <div style={fieldLabel}>Program *</div>
                  <select value={newSectionProgram} onChange={e => setNewSectionProgram(e.target.value)} style={selectStyle}>
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.program_code}</option>)}
                  </select>
                </div>
                <div>
                  <div style={fieldLabel}>Year Level *</div>
                  <select value={newSectionYear} onChange={e => setNewSectionYear(e.target.value)} style={selectStyle}>
                    <option value="">Select Year</option>
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleAddSection} style={{ ...addBtnStyle("#60a5fa"), marginBottom: 12 }}>
                + Add Section
              </button>
              <input placeholder="🔍 Search sections..." value={searchSection}
                onChange={e => setSearchSection(e.target.value)} style={searchStyle} />
              <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)" }}>
                {sections.filter(s => s.section_name?.toLowerCase().includes(searchSection.toLowerCase())).length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>No sections found</div>
                ) : sections.filter(s => s.section_name?.toLowerCase().includes(searchSection.toLowerCase())).map(s => (
                  <div key={s.id} style={listItemStyle}>
                    <div>
                      <span style={{ fontWeight: 600 }}>🏫 {s.section_name}</span>
                      {s.program_code && (
                        <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 8 }}>
                          {s.program_code} • Year {s.year_level}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteSection(s.id)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== SUBJECTS ===== */}
          <div style={cardStyle}>
            <div style={cardHeader("#8b5cf6")}>
              📚 Subjects <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({subjects.length})</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <div style={fieldLabel}>Subject Code</div>
                  <input placeholder="e.g. CC101" value={newSubjectCode}
                    onChange={e => setNewSubjectCode(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={fieldLabel}>Units</div>
                  <input placeholder="e.g. 3" value={newSubjectUnits}
                    onChange={e => setNewSubjectUnits(e.target.value)}
                    style={inputStyle} type="number" min="1" max="6" />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={fieldLabel}>Subject Name *</div>
                  <input placeholder="e.g. Computer Programming 1" value={newSubjectName}
                    onChange={e => setNewSubjectName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <div style={fieldLabel}>Program *</div>
                  <select value={newSubjectProgram} onChange={e => setNewSubjectProgram(e.target.value)} style={selectStyle}>
                    <option value="">Select Program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.program_code}</option>)}
                  </select>
                </div>
                <div>
                  <div style={fieldLabel}>Year Level *</div>
                  <select value={newSubjectYear} onChange={e => setNewSubjectYear(e.target.value)} style={selectStyle}>
                    <option value="">Select Year</option>
                    {YEAR_LEVELS.map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <div style={fieldLabel}>Semester *</div>
                  <select value={newSubjectSemester} onChange={e => setNewSubjectSemester(e.target.value)} style={selectStyle}>
                    <option value="">Select Semester</option>
                    <option value="1">1st Semester</option>
                    <option value="2">2nd Semester</option>
                  </select>
                </div>
              </div>
              <button onClick={handleAddSubject} style={{ ...addBtnStyle("#a78bfa"), marginBottom: 12 }}>
                + Add Subject
              </button>
              <input placeholder="🔍 Search subjects..." value={searchSubject}
                onChange={e => setSearchSubject(e.target.value)} style={searchStyle} />
              <div style={{ maxHeight: 260, overflowY: "auto", borderRadius: 8, border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)" }}>
                {subjects.filter(s =>
                  s.title?.toLowerCase().includes(searchSubject.toLowerCase()) ||
                  s.code?.toLowerCase().includes(searchSubject.toLowerCase())
                ).length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>No subjects found</div>
                ) : subjects.filter(s =>
                  s.title?.toLowerCase().includes(searchSubject.toLowerCase()) ||
                  s.code?.toLowerCase().includes(searchSubject.toLowerCase())
                ).map(s => (
                  <div key={s.id} style={listItemStyle}>
                    <div>
                      <span style={{ fontWeight: 600, color: isLight ? "#7c3aed" : "#a78bfa" }}>{s.code || "—"}</span>
                      <span style={{ marginLeft: 8, fontSize: 12 }}>{s.title}</span>
                    </div>
                    <button onClick={() => handleDeleteSubject(s.id)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== INSTRUCTORS ===== */}
          <div style={cardStyle}>
            <div style={cardHeader("#10b981")}>
              👨‍🏫 Instructors <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({instructors.length})</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={fieldLabel}>Full Name</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="e.g. Juan Dela Cruz" value={newInstructor}
                    onChange={e => setNewInstructor(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddInstructor()}
                    style={inputStyle} />
                  <button onClick={handleAddInstructor} style={{ ...addBtnStyle("#6ee7b7"), width: "auto", padding: "9px 16px" }}>+ Add</button>
                </div>
              </div>
              <input placeholder="🔍 Search instructors..." value={searchInstructor}
                onChange={e => setSearchInstructor(e.target.value)} style={searchStyle} />
              <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)" }}>
                {instructors.filter(i => i.fullname.toLowerCase().includes(searchInstructor.toLowerCase())).length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>No instructors found</div>
                ) : instructors.filter(i => i.fullname.toLowerCase().includes(searchInstructor.toLowerCase())).map(i => (
                  <div key={i.id} style={listItemStyle}>
                    <span>👨‍🏫 {i.fullname}</span>
                    <button onClick={() => handleDeleteInstructor(i.id)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== ROOMS ===== */}
          <div style={cardStyle}>
            <div style={cardHeader("#f97316")}>
              🚪 Rooms <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}>({rooms.length})</span>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={fieldLabel}>Room Code</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input placeholder="e.g. ROOM 101 or SLAB-1" value={newRoom}
                    onChange={e => setNewRoom(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleAddRoom()}
                    style={inputStyle} />
                  <button onClick={handleAddRoom} style={{ ...addBtnStyle("#fb923c"), width: "auto", padding: "9px 16px" }}>+ Add</button>
                </div>
              </div>
              <input placeholder="🔍 Search rooms..." value={searchRoom}
                onChange={e => setSearchRoom(e.target.value)} style={searchStyle} />
              <div style={{ maxHeight: 300, overflowY: "auto", borderRadius: 8, border: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,0.06)" }}>
                {rooms.filter(r => r.room_code.toLowerCase().includes(searchRoom.toLowerCase())).length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontSize: 12 }}>No rooms found</div>
                ) : rooms.filter(r => r.room_code.toLowerCase().includes(searchRoom.toLowerCase())).map(r => (
                  <div key={r.id} style={listItemStyle}>
                    <span>🚪 {r.room_code}</span>
                    <button onClick={() => handleDeleteRoom(r.id)} style={deleteBtnStyle}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
