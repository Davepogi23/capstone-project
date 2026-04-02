import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'

const app = express()
const db = new Database('C:/Users/Dave/Desktop/class_scheduling.db')

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

// Get subjects filtered by section (program + year level)
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

// ===== INSTRUCTOR ROUTES =====
app.get('/api/instructors', (req, res) => {
  const instructors = db.prepare('SELECT id, full_name as fullname FROM instructors').all()
  res.json(instructors)
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

// ===== SECTION ROUTES =====
// Get all sections from sections table (for dropdown)
app.get('/api/sections/list', (req, res) => {
  const sections = db.prepare('SELECT id, section_name FROM sections ORDER BY section_name').all()
  res.json(sections)
})

// Get all unique sections that have completed schedules (for schedules list page)
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

// ===== SCHEDULE ROUTES =====
// Get draft schedules
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

// Assign section to draft schedules
app.put('/api/schedules/assign-section', (req, res) => {
  const { section_id, ids } = req.body
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19)
  const stmt = db.prepare('UPDATE schedules SET section_id = ?, is_draft = 0, created_at = ? WHERE id = ?')
  ids.forEach(id => stmt.run(section_id, now, id))
  res.json({ success: true })
})

// Check for conflicts
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

  res.json({
    instructorConflict: instructorConflict || null,
    subjectConflict: null
  })
})

// Get all completed schedules
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

// Save a schedule (draft)
// Save a schedule (draft)
app.post('/api/schedules', (req, res) => {
  const { subject_id, instructor_id, room_id, class_type, day, start_time, term_id, section_id } = req.body
  try {
    // Calculate end time (add 30 minutes to start time)
    const [h, m] = start_time.split(':').map(Number);
    const totalMinutes = h * 60 + m + 30;
    const endHour = Math.floor(totalMinutes / 60);
    const endMin = totalMinutes % 60;
    const calculated_end_time = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}:00`;

    const stmt = db.prepare(
      'INSERT INTO schedules (term_id, section_id, subject_id, instructor_id, room_id, day, start_time, end_time, class_type, is_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
    )
    const result = stmt.run(term_id || 1, section_id || null, subject_id, instructor_id, room_id || null, day, start_time, calculated_end_time, class_type || 'LEC')
    res.json({ id: result.lastInsertRowid })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete a schedule
app.delete('/api/schedules/:id', (req, res) => {
  if (!req.params.id || isNaN(req.params.id)) {
    return res.status(400).json({ error: 'Invalid ID' })
  }
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Get schedules by section
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
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  // Try plain text first (existing accounts)
  let user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
  // If not found, try hashed password (new accounts)
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


// ===== ADD THESE ROUTES TO YOUR server.js =====
// Place them BEFORE the app.listen line at the bottom

// Simple hash function (for capstone - no extra packages needed)
function simpleHash(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0') + 
         Buffer.from(password).toString('base64');
}

// Get all users (without passwords)
app.get('/api/users', (req, res) => {
  const users = db.prepare('SELECT id, username FROM users ORDER BY id').all()
  res.json(users)
})

// Add new user
app.post('/api/users', (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  // Check if username already exists
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existing) {
    return res.status(400).json({ error: 'Username already exists' })
  }
  try {
    const hashedPassword = simpleHash(password)
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hashedPassword)
    res.json({ id: result.lastInsertRowid, username })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const users = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (users.count <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last admin account' })
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Reset password
app.put('/api/users/:id/password', (req, res) => {
  const { password } = req.body
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const hashedPassword = simpleHash(password)
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, req.params.id)
  res.json({ success: true })
})


app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})