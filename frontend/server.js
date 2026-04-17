import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'

const app = express()
const db = new Database('./class_scheduling.db')
db.pragma('foreign_keys = OFF')

app.use(cors())
app.use(express.json())

// ===== LOCK ROUTES =====
app.get('/api/lock', (req, res) => {
  const lock = db.prepare('SELECT * FROM locks LIMIT 1').get()
  res.json(lock || null)
})

app.post('/api/lock', (req, res) => {
  const { username } = req.body
  const existing = db.prepare('SELECT * FROM locks LIMIT 1').get()
  if (existing) {
    const lockedAt = new Date(existing.locked_at + 'Z')
    const now = new Date()
    const diffMinutes = (now - lockedAt) / 1000 / 60
    if (diffMinutes > 5) {
      db.prepare('DELETE FROM locks').run()
    } else {
      return res.json({ success: false, lockedBy: existing.locked_by })
    }
  }
  db.prepare('INSERT INTO locks (locked_by) VALUES (?)').run(username)
  res.json({ success: true })
})

app.delete('/api/lock', (req, res) => {
  const { username } = req.body
  db.prepare('DELETE FROM locks WHERE locked_by = ?').run(username)
  res.json({ success: true })
})

// ===== SUBJECT ROUTES =====
app.get('/api/subjects', (req, res) => {
  const subjects = db.prepare('SELECT id, subject_code as code, subject_name as title FROM subjects').all()
  res.json(subjects)
})

app.get('/api/subjects/by-section/:section_id', (req, res) => {
  const section = db.prepare('SELECT program_id, year_level FROM sections WHERE id = ?').get(req.params.section_id)
  if (!section) return res.json([])
  const subjects = db.prepare(`
    SELECT id, subject_code as code, subject_name as title
    FROM subjects
    WHERE program_id = ? AND year_level = ?
    ORDER BY semester, subject_name
  `).all(section.program_id, section.year_level)
  res.json(subjects)
})

app.post('/api/subjects', (req, res) => {
  const { subject_code, subject_name, program_id, year_level, semester, units } = req.body
  if (!subject_name || !program_id || !year_level || !semester) {
    return res.status(400).json({ error: 'subject_name, program_id, year_level, and semester are required' })
  }
  try {
    const result = db.prepare(
      'INSERT INTO subjects (subject_code, subject_name, program_id, year_level, semester, units) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(subject_code || '', subject_name, program_id, year_level, semester, units || 3)
    res.json({ id: result.lastInsertRowid, code: subject_code || '', title: subject_name, program_id, year_level, semester, units: units || 3 })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/subjects/:id', (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== INSTRUCTOR ROUTES =====
app.get('/api/instructors', (req, res) => {
  const instructors = db.prepare('SELECT id, full_name as fullname FROM instructors ORDER BY full_name ASC').all()
  res.json(instructors)
})

app.post('/api/instructors', (req, res) => {
  const { fullname } = req.body
  if (!fullname) return res.status(400).json({ error: 'fullname is required' })
  try {
    const result = db.prepare('INSERT INTO instructors (full_name) VALUES (?)').run(fullname)
    res.json({ id: result.lastInsertRowid, fullname })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/instructors/:id', (req, res) => {
  db.prepare('DELETE FROM instructors WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== ROOM ROUTES =====
app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT id, room_code FROM rooms ORDER BY room_code ASC').all()
  res.json(rooms)
})

app.post('/api/rooms', (req, res) => {
  const { room_code } = req.body
  if (!room_code) return res.status(400).json({ error: 'room_code is required' })
  try {
    const result = db.prepare('INSERT INTO rooms (room_code) VALUES (?)').run(room_code)
    res.json({ id: result.lastInsertRowid, room_code })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/rooms/:id', (req, res) => {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== SECTION ROUTES =====
app.get('/api/sections/list', (req, res) => {
  const sections = db.prepare('SELECT id, section_name FROM sections ORDER BY section_name').all()
  res.json(sections)
})

app.get('/api/sections', (req, res) => {
  const sections = db.prepare(`
    SELECT 
      sc.id as section_id,
      sc.section_name as section,
      MIN(s.created_at) as created_at,
      COUNT(*) as total_subjects
    FROM schedules s
    JOIN sections sc ON s.section_id = sc.id
    WHERE s.is_draft = 0
    GROUP BY sc.id, sc.section_name
    ORDER BY created_at DESC
  `).all()
  res.json(sections)
})

app.get('/api/sections/all', (req, res) => {
  const sections = db.prepare(`
    SELECT s.id, s.section_name, s.year_level, s.program_id, 
           p.program_code, p.program_name
    FROM sections s
    LEFT JOIN programs p ON s.program_id = p.id
    ORDER BY p.program_code, s.year_level, s.section_name
  `).all()
  res.json(sections)
})

app.post('/api/sections', (req, res) => {
  const { section_name, program_id, year_level } = req.body
  if (!section_name || !program_id || !year_level) {
    return res.status(400).json({ error: 'section_name, program_id, and year_level are required' })
  }
  try {
    const result = db.prepare(
      'INSERT INTO sections (section_name, program_id, year_level) VALUES (?, ?, ?)'
    ).run(section_name, program_id, year_level)
    res.json({ id: result.lastInsertRowid, section_name, program_id, year_level })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/sections/:id', (req, res) => {
  db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== PROGRAMS ROUTE =====
// Returns both program_code and program_name so dropdown shows "BSIT" etc.
app.get('/api/programs', (req, res) => {
  const programs = db.prepare('SELECT id, program_code, program_name FROM programs ORDER BY program_code').all()
  res.json(programs)
})


app.post('/api/programs', (req, res) => {
  const { program_code, program_name, level, program_type } = req.body
  if (!program_code || !program_name) {
    return res.status(400).json({ error: 'program_code and program_name are required' })
  }
  const existing = db.prepare('SELECT id FROM programs WHERE program_code = ?').get(program_code)
  if (existing) return res.status(400).json({ error: 'Program code already exists' })
  try {
    const result = db.prepare(
      'INSERT INTO programs (program_code, program_name, level, program_type) VALUES (?, ?, ?, ?)'
    ).run(program_code, program_name, level || 'College', program_type || 'BACHELOR')
    res.json({ id: result.lastInsertRowid, program_code, program_name, level: level || 'College', program_type: program_type || 'BACHELOR' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/programs/:id', (req, res) => {
  try {
    const id = req.params.id
    // Count linked records
    const linkedSections = db.prepare('SELECT COUNT(*) as count FROM sections WHERE program_id = ?').get(id)
    const linkedSubjects = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE program_id = ?').get(id)
    // Delete all linked subjects first
    db.prepare('DELETE FROM subjects WHERE program_id = ?').run(id)
    // Delete all linked sections
    db.prepare('DELETE FROM sections WHERE program_id = ?').run(id)
    // Delete the program itself
    db.prepare('DELETE FROM programs WHERE id = ?').run(id)
    res.json({ 
      success: true,
      deletedSections: linkedSections.count,
      deletedSubjects: linkedSubjects.count
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ===== SCHEDULE ROUTES =====
app.get('/api/schedules/draft', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      s.*,
      sub.subject_name as subject_title,
      sub.subject_code,
      i.full_name as instructor_name,
      r.room_code,
      sc.section_name
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN instructors i ON s.instructor_id = i.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN sections sc ON s.section_id = sc.id
    WHERE s.is_draft = 1
    ORDER BY s.day, s.start_time
  `).all()
  res.json(schedules)
})

app.put('/api/schedules/assign-section', (req, res) => {
  const { section_id, ids } = req.body
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const stmt = db.prepare('UPDATE schedules SET section_id = ?, is_draft = 0, created_at = ? WHERE id = ?')
  ids.forEach(id => stmt.run(section_id, now, id))
  res.json({ success: true })
})

app.get('/api/schedules/conflicts', (req, res) => {
  const { instructor_id, day, time } = req.query
  const instructorConflict = db.prepare(`
    SELECT s.*, sub.subject_name as subject_title, i.full_name as instructor_name, sc.section_name
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN instructors i ON s.instructor_id = i.id
    JOIN sections sc ON s.section_id = sc.id
    WHERE s.instructor_id = ?
    AND s.day = ?
    AND s.start_time <= ?
    AND s.end_time > ?
    AND s.is_draft = 0
  `).get(instructor_id, day, time, time)
  res.json({ instructorConflict: instructorConflict || null, subjectConflict: null })
})

app.get('/api/schedules', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      s.*,
      sub.subject_name as subject_title,
      sub.subject_code,
      i.full_name as instructor_name,
      r.room_code,
      sc.section_name
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN instructors i ON s.instructor_id = i.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN sections sc ON s.section_id = sc.id
    WHERE s.is_draft = 0
    ORDER BY sc.section_name, s.day, s.start_time
  `).all()
  res.json(schedules)
})

app.post('/api/schedules', (req, res) => {
  const { subject_id, instructor_id, room_id, class_type, day, start_time, end_time, term_id, section_id } = req.body
  try {
    // Use end_time from frontend if provided, otherwise calculate 30min default
    let final_end_time = end_time
    if (!final_end_time) {
      const [h, m] = start_time.split(':').map(Number)
      const totalMinutes = h * 60 + m + 30
      const endHour = Math.floor(totalMinutes / 60)
      const endMin = totalMinutes % 60
      final_end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`
    }
    const stmt = db.prepare(
      'INSERT INTO schedules (term_id, section_id, subject_id, instructor_id, room_id, day, start_time, end_time, class_type, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    )
    const result = stmt.run(term_id || 1, section_id || null, subject_id, instructor_id, room_id || null, day, start_time, final_end_time, class_type || 'LEC')
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.put('/api/schedules/:id', (req, res) => {
  const { end_time } = req.body
  if (!end_time) return res.status(400).json({ error: 'end_time is required' })
  try {
    db.prepare('UPDATE schedules SET end_time = ? WHERE id = ?').run(end_time, req.params.id)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/schedules/:id', (req, res) => {
  if (!req.params.id || isNaN(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== ROOM AVAILABILITY ROUTE =====
app.get('/api/schedules/room-availability', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      s.id, s.day, s.start_time, s.end_time, s.class_type,
      sub.subject_name as subject_title,
      i.full_name as instructor_name,
      r.id as room_id, r.room_code,
      sc.id as section_id, sc.section_name
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN instructors i ON s.instructor_id = i.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN sections sc ON s.section_id = sc.id
    WHERE s.is_draft = 0 AND r.id IS NOT NULL
    ORDER BY r.room_code, s.day, s.start_time
  `).all()
  res.json(schedules)
})

app.get('/api/schedules/section/:section_id', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      s.*,
      sub.subject_name as subject_title,
      i.full_name as instructor_name,
      r.room_code,
      sc.section_name
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    JOIN instructors i ON s.instructor_id = i.id
    LEFT JOIN rooms r ON s.room_id = r.id
    LEFT JOIN sections sc ON s.section_id = sc.id
    WHERE s.section_id = ? AND s.is_draft = 0
    ORDER BY s.day, s.start_time
  `).all(req.params.section_id)
  res.json(schedules)
})

// ===== TERMS ROUTES =====
app.get('/api/terms', (req, res) => {
  const terms = db.prepare('SELECT * FROM terms').all()
  res.json(terms)
})

// ===== LOGIN =====
function simpleHash(password) {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0') +
    Buffer.from(password).toString('base64')
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  let user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
  if (!user) {
    const hashedPassword = simpleHash(password)
    user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, hashedPassword)
  }
  if (user) {
    res.json({ success: true, username: user.username })
  } else {
    res.json({ success: false, message: 'Invalid username or password' })
  }
})

// ===== USER ROUTES =====
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, username FROM users ORDER BY id').all()
  res.json(users)
})

app.post('/api/users', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) return res.status(400).json({ error: 'Username already exists' })
  try {
    const hashedPassword = simpleHash(password)
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword)
    res.json({ id: result.lastInsertRowid, username })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

app.delete('/api/users/:id', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (users.count <= 1) return res.status(400).json({ error: 'Cannot delete the last admin account' })
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

app.put('/api/users/:id/password', (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const hashedPassword = simpleHash(password)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id)
  res.json({ success: true })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})
