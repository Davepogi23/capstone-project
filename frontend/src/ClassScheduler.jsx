import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAY_SHORT = ["M","T","W","TH","F","S"];
const DAY_CODES = ["MON","TUE","WED","THU","FRI","SAT"];

const TIME_SLOTS = [
  "7:00 AM","7:30 AM","8:00 AM","8:30 AM",
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM","11:00 AM","11:30 AM",
  "12:00 PM","12:30 PM","1:00 PM","1:30 PM","2:00 PM","2:30 PM",
  "3:00 PM","3:30 PM","4:00 PM","4:30 PM","5:00 PM","5:30 PM",
  "6:00 PM","6:30 PM","7:00 PM","7:30 PM","8:00 PM","8:30 PM",
  "9:00 PM"
];

const SUBJECT_COLORS = [
  "#3B82F6","#8B5CF6","#EC4899","#F97316","#10B981","#14B8A6",
  "#F59E0B","#EF4444","#6366F1","#84CC16"
];

const API = "http://localhost:3000/api";
const CELL_HEIGHT = 52;

const slotToMinutes = (idx) => {
  const clamped = Math.max(0, Math.min(idx, TIME_SLOTS.length - 1));
  const t = TIME_SLOTS[clamped];
  if (!t) return 0;
  const [timePart, period] = t.split(" ");
  const [h, m] = timePart.split(":").map(Number);
  const isPM = period === "PM";
  const h24 = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
  return h24 * 60 + (m || 0);
};

const slotToTimeString = (idx) => {
  const clamped = Math.max(0, Math.min(idx, TIME_SLOTS.length - 1));
  const mins = slotToMinutes(clamped);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:00`;
};

const timeStringToSlot = (timeStr) => {
  if (!timeStr) return -1;
  const [h, m] = timeStr.split(":").map(Number);
  const totalMin = h * 60 + m;
  return TIME_SLOTS.findIndex((_, idx) => slotToMinutes(idx) === totalMin);
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2,"0")} ${period}`;
};

export default function ClassScheduler({ theme }) {
  const isLight = theme === "light";
  const navigate = useNavigate();

  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedType, setSelectedType] = useState("LEC");
  const [searchSubject, setSearchSubject] = useState("");
  const [searchInstructor, setSearchInstructor] = useState("");
  const [searchRoom, setSearchRoom] = useState("");
  const [scheduleBlocks, setScheduleBlocks] = useState([]);
  const [dragCreate, setDragCreate] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedBy, setLockedBy] = useState("");
  const [lockChecked, setLockChecked] = useState(false);

  // Refs - avoid stale closures
  const subjectColors = useRef({});
  const colorIdx = useRef(0);
  const isDragging = useRef(false);
  const mouseDownInfo = useRef(null);
  const dragCreateRef = useRef(null);
  const scheduleBlocksRef = useRef([]);
  const resizeRef = useRef(null); // { blockId, day, startSlot, currentEndSlot }
  const selectedSubjectRef = useRef(null);
  const selectedInstructorRef = useRef(null);
  const selectedRoomRef = useRef(null);
  const selectedTypeRef = useRef("LEC");
  const selectedSectionRef = useRef(null);
  const isLockedRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { scheduleBlocksRef.current = scheduleBlocks; }, [scheduleBlocks]);
  useEffect(() => { selectedSubjectRef.current = selectedSubject; }, [selectedSubject]);
  useEffect(() => { selectedInstructorRef.current = selectedInstructor; }, [selectedInstructor]);
  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);
  useEffect(() => { selectedTypeRef.current = selectedType; }, [selectedType]);
  useEffect(() => { selectedSectionRef.current = selectedSection; }, [selectedSection]);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  const getSubjectColor = (subjectId) => {
    if (!subjectColors.current[subjectId]) {
      subjectColors.current[subjectId] = SUBJECT_COLORS[colorIdx.current % SUBJECT_COLORS.length];
      colorIdx.current++;
    }
    return subjectColors.current[subjectId];
  };

  const showToast = (msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchSubjects();
    fetchInstructors();
    fetchSchedules();
    fetchSections();
    fetchRooms();
    acquireLock();
    window.addEventListener("beforeunload", releaseLock);
    return () => { releaseLock(); window.removeEventListener("beforeunload", releaseLock); };
  }, []);

  useEffect(() => {
    const onMouseUp = async () => {
      // ===== HANDLE RESIZE END =====
      if (resizeRef.current) {
        const { blockId, day, startSlot, currentEndSlot, originalEndSlot } = resizeRef.current;
        resizeRef.current = null;

        if (currentEndSlot !== originalEndSlot) {
          // Check overlap with other blocks
          const blocks = scheduleBlocksRef.current;
          const hasOverlap = blocks.some(b =>
            b.id !== blockId &&
            b.day === day &&
            b.startSlot < currentEndSlot &&
            b.endSlot > startSlot
          );
          if (hasOverlap) {
            showToast("Cannot resize — overlaps another block!", "error");
            // Revert to original
            setScheduleBlocks(prev => {
              const updated = prev.map(b =>
                b.id === blockId ? { ...b, endSlot: originalEndSlot } : b
              );
              scheduleBlocksRef.current = updated;
              return updated;
            });
            return;
          }
          // Save new end time to DB
          const endTimeStr = slotToTimeString(Math.min(currentEndSlot, TIME_SLOTS.length - 1));
          try {
            await fetch(`${API}/schedules/${blockId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ end_time: endTimeStr })
            });
            showToast("Schedule resized!", "success");
          } catch (err) {
            showToast("Failed to save resize!", "error");
          }
        }
        return;
      }

      const dc = dragCreateRef.current;
      const md = mouseDownInfo.current;

      if (!md || !dc) {
        isDragging.current = false;
        mouseDownInfo.current = null;
        dragCreateRef.current = null;
        setDragCreate(null);
        return;
      }

      const wasDragging = isDragging.current;
      const { day, slotIdx: startSlot } = md;
      const { currentSlot } = dc;

      isDragging.current = false;
      mouseDownInfo.current = null;
      dragCreateRef.current = null;
      setDragCreate(null);

      if (wasDragging) {
        const minSlot = Math.min(startSlot, currentSlot);
        const maxSlot = Math.max(startSlot, currentSlot);
        await saveScheduleRef.current(day, minSlot, maxSlot + 1);
      } else {
        await saveScheduleRef.current(day, startSlot, startSlot + 2);
      }
    };

    // Global mousemove: track resize by calculating slot from Y position on the table
    const onMouseMove = (e) => {
      if (!resizeRef.current) return;
      // Find all time-slot rows by data attribute
      const rows = document.querySelectorAll("[data-slot-row]");
      if (!rows.length) return;
      let closestSlot = -1;
      let closestDist = Infinity;
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const rowCenter = rect.top + rect.height / 2;
        const dist = Math.abs(e.clientY - rowCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestSlot = parseInt(row.dataset.slotRow);
        }
      });
      if (closestSlot !== -1) {
        handleResizeMoveRef.current(resizeRef.current.day, closestSlot);
      }
    };

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  const fetchSubjects = async (sectionId = null) => {
    const url = sectionId ? `${API}/subjects/by-section/${sectionId}` : `${API}/subjects`;
    const data = await fetch(url).then(r => r.json());
    setSubjects(data);
  };

  const fetchInstructors = async () => {
    const data = await fetch(`${API}/instructors`).then(r => r.json());
    setInstructors(data);
  };

  const fetchRooms = async () => {
    const data = await fetch(`${API}/rooms`).then(r => r.json());
    setRooms(data);
  };

  const fetchSections = async () => {
    const data = await fetch(`${API}/sections/list`).then(r => r.json());
    setSections(data);
  };

  const fetchSchedules = async () => {
    const data = await fetch(`${API}/schedules/draft`).then(r => r.json());
    const dayMap = {
      MON:0,TUE:1,WED:2,THU:3,FRI:4,SAT:5,SUN:6,
      Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4,Saturday:5,Sunday:6
    };
    const blocks = data.map(entry => {
      const startSlot = timeStringToSlot(entry.start_time);
      const rawEnd = timeStringToSlot(entry.end_time);
      const endSlot = rawEnd !== -1 ? rawEnd : startSlot + 2;
      const dayIdx = dayMap[entry.day] ?? 0;
      return {
        id: entry.id,
        subject: { id: entry.subject_id, title: entry.subject_title || "Subject" },
        instructor: { id: entry.instructor_id, fullname: entry.instructor_name || "Instructor" },
        room: { id: entry.room_id, room_code: entry.room_code },
        type: entry.class_type,
        section_id: entry.section_id,
        day: dayIdx,
        startSlot,
        endSlot,
      };
    }).filter(b => b.startSlot !== -1);
    setScheduleBlocks(blocks);
    scheduleBlocksRef.current = blocks;
    setLoading(false);
  };

  const acquireLock = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    const res = await fetch(`${API}/lock`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: user.username })
    });
    const data = await res.json();
    if (data.success) {
      setIsLocked(false); isLockedRef.current = false;
    } else {
      if (data.lockedBy === user.username) {
        await fetch(`${API}/lock`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username }) });
        const res2 = await fetch(`${API}/lock`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username }) });
        const data2 = await res2.json();
        if (data2.success) { setIsLocked(false); isLockedRef.current = false; }
      } else {
        setIsLocked(true); isLockedRef.current = true; setLockedBy(data.lockedBy);
      }
    }
    setLockChecked(true);
  };

  const releaseLock = async () => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;
    await fetch(`${API}/lock`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username }) });
  };

  // Uses REFS so always has latest values — no stale closure
  const saveSchedule = async (day, startSlot, endSlot) => {
    const sub = selectedSubjectRef.current;
    const ins = selectedInstructorRef.current;
    const room = selectedRoomRef.current;
    const type = selectedTypeRef.current;
    const section = selectedSectionRef.current;
    const blocks = scheduleBlocksRef.current;

    const clampedStart = Math.max(0, Math.min(startSlot, TIME_SLOTS.length - 1));
    const clampedEnd = Math.max(clampedStart + 1, Math.min(endSlot, TIME_SLOTS.length));

    // Check overlap using ref
    const hasOverlap = blocks.some(b =>
      b.day === day && b.startSlot < clampedEnd && b.endSlot > clampedStart
    );
    if (hasOverlap) {
      showToast("That time range overlaps an existing schedule!", "error"); return;
    }

    const startTimeStr = slotToTimeString(clampedStart);
    const endTimeStr = slotToTimeString(Math.min(clampedEnd, TIME_SLOTS.length - 1));
    const dayName = DAYS[day];

    // Conflict check
    const conflictRes = await fetch(`${API}/schedules/conflicts?instructor_id=${ins.id}&day=${dayName}&time=${startTimeStr}`);
    const { instructorConflict } = await conflictRes.json();
    if (instructorConflict) {
      showToast(`Conflict! ${ins.fullname} already has a class at ${dayName} ${formatTime(startTimeStr)}`, "error");
      return;
    }

    try {
      const res = await fetch(`${API}/schedules`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_id: sub.id,
          instructor_id: ins.id,
          room_id: room?.id || null,
          class_type: type,
          day: DAY_CODES[day],
          start_time: startTimeStr,
          end_time: endTimeStr,
          section_id: section?.id
        })
      });
      const data = await res.json();
      if (data.error) { showToast(data.error, "error"); return; }

      const newBlock = {
        id: data.id,
        subject: sub,
        instructor: ins,
        room,
        type,
        section_id: section?.id,
        day,
        startSlot: clampedStart,
        endSlot: clampedEnd,
      };

      setScheduleBlocks(prev => {
        const updated = [...prev, newBlock];
        scheduleBlocksRef.current = updated;
        return updated;
      });
      showToast(`Scheduled ${sub.title}!`, "success");
    } catch (err) {
      showToast("Failed to save schedule!", "error");
    }
  };

  // Keep ref to latest saveSchedule — used by mouseup event listener
  const saveScheduleRef = useRef(null);
  saveScheduleRef.current = saveSchedule;

  // Keep ref to latest handleResizeMove — used by global mousemove listener
  const handleResizeMoveRef = useRef(null);

  // ===== RESIZE HANDLERS =====
  const handleResizeStart = (e, block) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = {
      blockId: block.id,
      day: block.day,
      startSlot: block.startSlot,
      currentEndSlot: block.endSlot,
      originalEndSlot: block.endSlot,
    };
  };

  const handleResizeMove = (day, slotIdx) => {
    if (!resizeRef.current) return;
    if (day !== resizeRef.current.day) return;
    // End slot must be at least 1 slot after start (min 30-min block)
    const minEnd = resizeRef.current.startSlot + 1;
    // Allow dragging up (shrinking) or down (expanding), but never below start+1
    const newEnd = Math.max(minEnd, slotIdx + 1);
    if (newEnd !== resizeRef.current.currentEndSlot) {
      resizeRef.current.currentEndSlot = newEnd;
      // Update block in state for live preview
      setScheduleBlocks(prev => {
        const updated = prev.map(b =>
          b.id === resizeRef.current?.blockId
            ? { ...b, endSlot: newEnd }
            : b
        );
        scheduleBlocksRef.current = updated;
        return updated;
      });
    }
  };
  handleResizeMoveRef.current = handleResizeMove;

  // ===== MOUSE DOWN =====
  const handleMouseDown = (day, slotIdx, e) => {
    if (isLockedRef.current || e.button !== 0) return;
    const sub = selectedSubjectRef.current;
    const ins = selectedInstructorRef.current;
    const room = selectedRoomRef.current;
    const section = selectedSectionRef.current;

    if (!section) { showToast("Please select a section first!", "warn"); return; }
    if (!sub || !ins) { showToast("Select a subject and instructor first!", "warn"); return; }
    if (!room) { showToast("Please select a room first!", "warn"); return; }

    const existingBlock = scheduleBlocksRef.current.find(b =>
      b.day === day && b.startSlot <= slotIdx && b.endSlot > slotIdx
    );
    if (existingBlock) return;

    isDragging.current = false;
    mouseDownInfo.current = { day, slotIdx };
    const initial = { day, startSlot: slotIdx, currentSlot: slotIdx };
    dragCreateRef.current = initial;
    setDragCreate(initial);
    e.preventDefault();
  };

  // ===== MOUSE ENTER =====
  const handleMouseEnter = (day, slotIdx) => {
    if (!mouseDownInfo.current) return;
    if (day !== mouseDownInfo.current.day) return;
    isDragging.current = true; // any movement = dragging
    const updated = { day, startSlot: mouseDownInfo.current.slotIdx, currentSlot: slotIdx };
    dragCreateRef.current = updated;
    setDragCreate(updated);
  };

  // handleMouseUp is defined inside useEffect above using saveScheduleRef

  const handleRemoveBlock = async (blockId) => {
    try {
      await fetch(`${API}/schedules/${blockId}`, { method: "DELETE" });
      setScheduleBlocks(prev => {
        const updated = prev.filter(b => b.id !== blockId);
        scheduleBlocksRef.current = updated;
        return updated;
      });
      showToast("Schedule removed!", "success");
    } catch (err) {
      showToast("Failed to delete!", "error");
    }
  };

  const handleCreateSchedule = async () => {
    const section = selectedSectionRef.current;
    if (!section) { showToast("Please select a section first!", "warn"); return; }
    const blocks = scheduleBlocksRef.current;
    if (blocks.length === 0) { showToast("Please add subjects to the grid first!", "warn"); return; }
    try {
      const ids = blocks.map(b => b.id);
      await fetch(`${API}/schedules/assign-section`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_id: section.id, ids })
      });
      showToast("Schedule created successfully! 🎉", "success");
      setScheduleBlocks([]);
      scheduleBlocksRef.current = [];
      setSelectedSection(null);
      selectedSectionRef.current = null;
      setTimeout(() => navigate("/schedules"), 1500);
    } catch (err) {
      showToast("Failed to create schedule!", "error");
    }
  };

  const handleClear = async () => {
    if (!confirm("Clear everything? This will delete all unsaved schedules!")) return;
    const blocks = scheduleBlocksRef.current;
    await Promise.all(blocks.map(b => fetch(`${API}/schedules/${b.id}`, { method: "DELETE" })));
    setScheduleBlocks([]);
    scheduleBlocksRef.current = [];
    setSelectedSection(null);
    selectedSectionRef.current = null;
    showToast("Cleared!", "success");
  };

  const dragPreview = dragCreate ? {
    day: dragCreate.day,
    start: Math.min(dragCreate.startSlot, dragCreate.currentSlot),
    end: Math.max(dragCreate.startSlot, dragCreate.currentSlot) + 1
  } : null;

  if (loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", color:"#e2e8f0", fontSize:20 }}>Loading...</div>
  );

  return (
    <div style={{ minHeight:"100vh", background:isLight?"#f1f5f9":"linear-gradient(135deg,#0f0c29,#302b63,#24243e)", fontFamily:"'Segoe UI',sans-serif", color:isLight?"#1e293b":"#e2e8f0", padding:"24px", boxSizing:"border-box", userSelect:"none" }}>

      {/* Header */}
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div style={{ fontSize:11, letterSpacing:6, color:"#94a3b8", textTransform:"uppercase", marginBottom:6 }}>Web Based Class Scheduling for ACLC</div>
        <h1 style={{ margin:"0 0 16px", fontSize:32, fontWeight:800, background:"linear-gradient(90deg,#60a5fa,#a78bfa,#f472b6)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Class Scheduler</h1>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, background:isLight?"white":"rgba(255,255,255,0.05)", border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 16px", width:400 }}>
            <span style={{ fontSize:16 }}>🏫</span>
            <select value={selectedSection?.id||""} onChange={e => {
              const sec = sections.find(s => s.id === parseInt(e.target.value));
              setSelectedSection(sec||null);
              selectedSectionRef.current = sec||null;
              setSelectedSubject(null);
              selectedSubjectRef.current = null;
              if (sec) fetchSubjects(sec.id); else fetchSubjects();
            }} style={{ flex:1, background:"transparent", border:"none", color:isLight?"#1e293b":"#e2e8f0", fontSize:13, outline:"none", fontFamily:"'Segoe UI',sans-serif", cursor:"pointer" }}>
              <option value="">Select a section...</option>
              {sections.map(s => <option key={s.id} value={s.id} style={{ background:isLight?"white":"#1e293b" }}>{s.section_name}</option>)}
            </select>
            {selectedSection && <span style={{ fontSize:10, fontWeight:700, color:"#60a5fa", background:"rgba(96,165,250,0.15)", padding:"3px 8px", borderRadius:20, border:"1px solid rgba(96,165,250,0.3)" }}>{selectedSection.section_name}</span>}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div style={{ position:"fixed", top:20, right:20, zIndex:999, background:toast.type==="success"?"#10b981":toast.type==="warn"?"#f59e0b":"#ef4444", color:"white", padding:"10px 18px", borderRadius:10, fontWeight:600, boxShadow:"0 4px 20px rgba(0,0,0,0.4)", fontSize:13 }}>{toast.msg}</div>}

      {/* Lock Banner */}
      {lockChecked && isLocked && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:998, background:"rgba(239,68,68,0.95)", padding:"14px 24px", display:"flex", alignItems:"center", justifyContent:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>🔒</span>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:"white" }}>Scheduler is currently locked</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.8)" }}><strong>{lockedBy}</strong> is currently editing.</div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", gap:20, alignItems:"flex-start" }}>

        {/* GRID */}
        <div style={{ flex:1, overflowX:"auto", minWidth:800 }}>
          <div style={{ background:isLight?"white":"rgba(255,255,255,0.04)", borderRadius:16, border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.1)", overflow:"hidden", width:"100%", minWidth:800 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", minWidth:800, tableLayout:"fixed" }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle(isLight), width:80, background:"rgba(96,165,250,0.15)" }}>Time</th>
                  {DAYS.map((d,i) => (
                    <th key={i} style={{ ...thStyle(isLight), width:"calc(100% / 7)", background:"rgba(96,165,250,0.1)" }}>
                      <div style={{ fontWeight:700 }}>{DAY_SHORT[i]}</div>
                      <div style={{ fontSize:9, color:"#94a3b8", fontWeight:400 }}>{d.slice(0,3)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, tIdx) => (
                  <tr key={tIdx} data-slot-row={tIdx} style={{ height:CELL_HEIGHT }}>
                    {/* Time label — only show on the hour */}
                    <td style={{ padding:"4px 8px", fontSize:11, color:"#94a3b8", borderBottom:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)", borderRight:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.08)", textAlign:"right", whiteSpace:"nowrap", fontWeight:600, width:80, verticalAlign:"top", boxSizing:"border-box" }}>
                      {time}
                    </td>
                    {DAYS.map((_, dIdx) => {
                      // Block starting at this slot
                      const block = scheduleBlocks.find(b => b.day === dIdx && b.startSlot === tIdx);
                      // Cell is inside an existing block (not the start) — skip with null
                      const insideBlock = scheduleBlocks.find(b => b.day === dIdx && b.startSlot < tIdx && b.endSlot > tIdx);
                      if (insideBlock) return (
                        <td key={dIdx}
                          onMouseEnter={() => { handleMouseEnter(dIdx, tIdx); handleResizeMove(dIdx, tIdx); }}
                          style={{ padding:0, border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)", borderRight:dIdx === 6 ? "none" : (isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)"), height:CELL_HEIGHT, background:"transparent" }}
                        />
                      );

                      const inPreview = dragPreview && dragPreview.day === dIdx && tIdx >= dragPreview.start && tIdx < dragPreview.end;
                      const isPreviewStart = dragPreview && dragPreview.day === dIdx && tIdx === dragPreview.start;

                      if (block) {
                        const rowSpan = Math.max(1, block.endSlot - block.startSlot);
                        const color = getSubjectColor(block.subject.id);
                        const startTime = slotToTimeString(block.startSlot);
                        const endTime = slotToTimeString(Math.min(block.endSlot, TIME_SLOTS.length - 1));
                        return (
                          <td key={dIdx} rowSpan={rowSpan}
                            style={{ padding:0, border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)", borderRight:dIdx === 6 ? "none" : (isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)"), verticalAlign:"top", position:"relative", height: rowSpan * CELL_HEIGHT }}>
                            <div style={{ background:`${color}22`, border:`1.5px solid ${color}88`, borderLeft:`4px solid ${color}`, borderRadius:6, padding:0, height: "100%", width: "100%", boxSizing:"border-box", position:"relative", overflow:"hidden" }}>
                              <div style={{ fontSize:11, fontWeight:700, color, lineHeight:1.3 }}>{block.subject.title}</div>
                              <div style={{ fontSize:10, color:isLight?"#475569":"#cbd5e1", marginTop:2 }}>{block.instructor.fullname}</div>
                              {block.room?.room_code && <div style={{ fontSize:10, color:isLight?"#64748b":"#94a3b8", marginTop:1 }}>{block.room.room_code}</div>}
                              <div style={{ fontSize:9, fontWeight:700, marginTop:2, color:block.type==="LAB"?"#f472b6":"#60a5fa" }}>{block.type||"LEC"}</div>
                              <div style={{ fontSize:9, color:"#94a3b8", marginTop:2 }}>{formatTime(startTime)} – {formatTime(endTime)}</div>
                                <button onClick={(e) => { e.stopPropagation(); handleRemoveBlock(block.id); }}
                                style={{ position:"absolute", top:3, right:3, background:"rgba(239,68,68,0.3)", border:"none", color:"#fca5a5", borderRadius:3, width:16, height:16, cursor:"pointer", fontSize:10, display:"flex", alignItems:"center", justifyContent:"center", padding:0 }}>✕</button>
                              {/* RESIZE HANDLE — bottom edge */}
                              <div
                                onMouseDown={(e) => handleResizeStart(e, block)}
                                style={{ position:"absolute", bottom:0, left:0, right:0, height:8, cursor:"ns-resize", display:"flex", alignItems:"center", justifyContent:"center", borderRadius:"0 0 6px 6px", background:"rgba(0,0,0,0.15)" }}
                              >
                                <div style={{ width:24, height:3, borderRadius:2, background:"rgba(255,255,255,0.5)" }} />
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={dIdx}
                          onMouseDown={(e) => handleMouseDown(dIdx, tIdx, e)}
                          onMouseEnter={() => { handleMouseEnter(dIdx, tIdx); handleResizeMove(dIdx, tIdx); }}
                          style={{
                            padding:2,
                            border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)",
                            borderRight:dIdx === 6 ? "none" : (isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.05)"),
                            height:CELL_HEIGHT,
                            cursor:isLocked?"not-allowed":"pointer",
                            background:isPreviewStart?"rgba(96,165,250,0.3)":inPreview?"rgba(96,165,250,0.15)":"transparent",
                            transition:"background 0.1s",
                            verticalAlign:"top",
                            position:"relative"
                          }}>
                          {isPreviewStart && dragCreate && (
                            <div style={{ position:"absolute", inset:2, border:"2px dashed rgba(96,165,250,0.7)", borderRadius:6, display:"flex", alignItems:"flex-start", padding:"3px 5px" }}>
                              <span style={{ fontSize:10, color:"rgba(96,165,250,0.9)", fontWeight:600 }}>
                                {formatTime(slotToTimeString(dragPreview.start))} → {formatTime(slotToTimeString(Math.min(dragPreview.end, TIME_SLOTS.length-1)))}
                              </span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize:11, color:"#64748b", marginTop:10, textAlign:"center" }}>
            💡 Click to place 1-hour block • Drag down on empty cell for custom duration • Drag ▬ bottom edge to resize
          </div>
        </div>

        {/* RIGHT PANELS */}
        <div style={{ display:"flex", flexDirection:"column", gap:16, width:200, flexShrink:0 }}>

          {/* Subjects */}
          <div style={panelStyle(isLight)}>
            <div style={panelHeader("#3b82f6", isLight)}>📚 Subjects</div>
            <div style={{ padding:8 }}>
              <input placeholder="🔍 Search..." value={searchSubject} onChange={e => setSearchSubject(e.target.value)} style={inputStyle(isLight)} />
              <div style={{ maxHeight:160, overflowY:"auto" }}>
                {subjects.filter(s => s.title.toLowerCase().includes(searchSubject.toLowerCase())).map(s => (
                  <div key={s.id} onClick={() => { setSelectedSubject(s); selectedSubjectRef.current = s; }}
                    style={{ padding:"8px 12px", margin:"3px 0", borderRadius:8, cursor:"pointer", background:selectedSubject?.id===s.id?`${getSubjectColor(s.id)}33`:"transparent", borderLeft:`4px solid ${getSubjectColor(s.id)}`, border:selectedSubject?.id===s.id?`1.5px solid ${getSubjectColor(s.id)}88`:"1.5px solid transparent", borderLeft:`4px solid ${getSubjectColor(s.id)}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:getSubjectColor(s.id) }}>{s.title}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Instructors */}
          <div style={panelStyle(isLight)}>
            <div style={panelHeader("#8b5cf6", isLight)}>👨‍🏫 Instructors</div>
            <div style={{ padding:8 }}>
              <input placeholder="🔍 Search..." value={searchInstructor} onChange={e => setSearchInstructor(e.target.value)} style={inputStyle(isLight)} />
              <div style={{ maxHeight:160, overflowY:"auto" }}>
                {instructors.filter(i => i.fullname.toLowerCase().includes(searchInstructor.toLowerCase())).map(ins => (
                  <div key={ins.id} onClick={() => { setSelectedInstructor(ins); selectedInstructorRef.current = ins; }}
                    style={{ padding:"8px 12px", margin:"3px 0", borderRadius:8, cursor:"pointer", background:selectedInstructor?.id===ins.id?"rgba(139,92,246,0.2)":"transparent", border:selectedInstructor?.id===ins.id?"1.5px solid rgba(139,92,246,0.6)":"1.5px solid transparent", borderLeft:"4px solid rgba(139,92,246,0.7)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:isLight?"#7c3aed":"#c4b5fd" }}>{ins.fullname}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div style={panelStyle(isLight)}>
            <div style={panelHeader("#10b981", isLight)}>🚪 Rooms</div>
            <div style={{ padding:8 }}>
              <input placeholder="🔍 Search room..." value={searchRoom} onChange={e => setSearchRoom(e.target.value)} style={inputStyle(isLight)} />
              <div style={{ maxHeight:160, overflowY:"auto" }}>
                {rooms.filter(r => r.room_code.toLowerCase().includes(searchRoom.toLowerCase())).map(r => (
                  <div key={r.id} onClick={() => {
                    const room = selectedRoom?.id===r.id ? null : r;
                    setSelectedRoom(room);
                    selectedRoomRef.current = room;
                    if (room) {
                      const t = room.room_code.toLowerCase().includes("slab") ? "LAB" : "LEC";
                      setSelectedType(t);
                      selectedTypeRef.current = t;
                    }
                  }}
                    style={{ padding:"8px 12px", margin:"3px 0", borderRadius:8, cursor:"pointer", background:selectedRoom?.id===r.id?"rgba(16,185,129,0.2)":"transparent", border:selectedRoom?.id===r.id?"1.5px solid rgba(16,185,129,0.6)":"1.5px solid transparent", borderLeft:"4px solid rgba(16,185,129,0.7)" }}>
                    <div style={{ fontSize:11, fontWeight:700, color:isLight?"#059669":"#6ee7b7" }}>{r.room_code}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selection Status */}
          <div style={{ ...panelStyle(isLight), padding:12 }}>
            <div style={{ fontSize:10, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Selected</div>
            {[
              { label:"SUBJECT", value:selectedSubject?.title, color:"#60a5fa" },
              { label:"INSTRUCTOR", value:selectedInstructor?.fullname, color:"#a78bfa" },
              { label:"ROOM", value:selectedRoom?.room_code, color:"#6ee7b7" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ marginBottom:6 }}>
                <div style={{ fontSize:9, color }}>{label}</div>
                <div style={{ fontSize:11, color:value?(isLight?"#1e293b":"#e2e8f0"):"#475569" }}>{value||"None selected"}</div>
              </div>
            ))}
            {(selectedSubject && selectedInstructor) || scheduleBlocks.length > 0 ? (
              <>
                <div style={{ marginTop:10 }}>
                  <div style={{ fontSize:9, color:"#64748b", marginBottom:6, textTransform:"uppercase", letterSpacing:1 }}>Type</div>
                  <div style={{ display:"flex", gap:6 }}>
                    {["LEC","LAB"].map(t => (
                      <button key={t} onClick={() => { setSelectedType(t); selectedTypeRef.current = t; }}
                        style={{ flex:1, padding:"6px 0", borderRadius:6, cursor:"pointer", fontSize:11, fontWeight:700, background:selectedType===t?(t==="LEC"?"rgba(96,165,250,0.3)":"rgba(236,72,153,0.3)"):"rgba(255,255,255,0.05)", color:selectedType===t?(t==="LEC"?"#60a5fa":"#f472b6"):"#64748b", border:selectedType===t?(t==="LEC"?"1px solid rgba(96,165,250,0.5)":"1px solid rgba(236,72,153,0.5)"):"1px solid transparent" }}>{t}</button>
                    ))}
                  </div>
                </div>
                {selectedSubject && selectedInstructor && selectedRoom && (
                  <div style={{ marginTop:10, padding:"6px 10px", borderRadius:6, background:"rgba(16,185,129,0.15)", border:"1px solid rgba(16,185,129,0.3)", fontSize:10, color:"#6ee7b7", textAlign:"center" }}>✓ Click cell or drag to place</div>
                )}
                <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <button onClick={handleClear} disabled={isLocked} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.3)", background:isLocked?"rgba(255,255,255,0.05)":"rgba(239,68,68,0.15)", color:isLocked?"#475569":"#fca5a5", fontSize:12, fontWeight:700, cursor:isLocked?"not-allowed":"pointer" }}>🗑️ Clear</button>
                  <button onClick={handleCreateSchedule} disabled={isLocked} style={{ flex:2, padding:"10px", borderRadius:8, border:"none", cursor:isLocked?"not-allowed":"pointer", fontSize:12, fontWeight:700, background:isLocked?"rgba(255,255,255,0.05)":"linear-gradient(90deg,#3b82f6,#8b5cf6)", color:isLocked?"#475569":"white" }}>+ Create Schedule</button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle = (isLight) => ({
  padding:"10px 6px", fontSize:11, fontWeight:700,
  borderBottom:isLight?"1px solid #cbd5e1":"1px solid rgba(255,255,255,0.1)",
  textAlign:"center", color:isLight?"#1e293b":"#e2e8f0", letterSpacing:0.5
});

const panelStyle = (isLight) => ({
  background:isLight?"white":"rgba(255,255,255,0.04)", borderRadius:12,
  border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.08)", overflow:"hidden",
  boxShadow:isLight?"0 1px 3px rgba(0,0,0,0.08)":"none"
});

const panelHeader = (color, isLight) => ({
  padding:"10px 12px", background:`${color}22`,
  borderBottom:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.06)",
  fontSize:12, fontWeight:700, color:isLight?"#1e293b":"#e2e8f0",
  letterSpacing:0.5, display:"flex", alignItems:"center", gap:6
});

const inputStyle = (isLight) => ({
  width:"100%", padding:"6px 8px", borderRadius:6, marginBottom:6,
  border:isLight?"1px solid #e2e8f0":"1px solid rgba(255,255,255,0.08)",
  background:isLight?"#f8fafc":"rgba(255,255,255,0.03)",
  color:isLight?"#1e293b":"#e2e8f0", fontSize:11, outline:"none", boxSizing:"border-box"
});
