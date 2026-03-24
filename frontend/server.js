import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'

const app = express()
const db = new Database('./class_scheduling.db')

app.use(cors())
app.use(express.json())

// ===== LOCK ROUTES =====
// Check if scheduler is locked
app.get('/api/lock', (req, res) => {
  const lock = db.prepare('SELECT * FROM locks LIMIT 1').get()
  res.json(lock || null)
})

// Acquire lock
app.post('/api/lock', (req, res) => {
  const { username } = req.body
  const existing = db.prepare('SELECT * FROM locks LIMIT 1').get()
  if (existing) {
    const lockedAt = new Date(existing.locked_at + 'Z')
    const now = new Date()
    const diffMinutes = (now - lockedAt) / 1000 / 60
    if (diffMinutes > 30) {
      db.prepare('DELETE FROM locks').run()
    } else {
      return res.json({ success: false, lockedBy: existing.locked_by })
    }
  }
  db.prepare('INSERT INTO locks (locked_by) VALUES (?)').run(username)
  res.json({ success: true })
})

// Release lock
app.delete('/api/lock', (req, res) => {
  const { username } = req.body
  db.prepare('DELETE FROM locks WHERE locked_by = ?').run(username)
  res.json({ success: true })
})

// ===== SUBJECT ROUTES =====
// Get all subjects
app.get('/api/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects').all()
  res.json(subjects)
})

// Add a subject
app.post('/api/subjects', (req, res) => {
  const { title } = req.body
  const stmt = db.prepare('INSERT INTO subjects (title) VALUES (?)')
  const result = stmt.run(title)
  res.json({ id: result.lastInsertRowid, title })
})

// Delete a subject
app.delete('/api/subjects/:id', (req, res) => {
  db.prepare('DELETE FROM subjects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== INSTRUCTOR ROUTES =====
// Get all instructors
app.get('/api/instructors', (req, res) => {
  const instructors = db.prepare('SELECT * FROM instructors').all()
  res.json(instructors)
})

// Add an instructor
app.post('/api/instructors', (req, res) => {
  const { fullname } = req.body
  const stmt = db.prepare('INSERT INTO instructors (fullname) VALUES (?)')
  const result = stmt.run(fullname)
  res.json({ id: result.lastInsertRowid, fullname })
})

// Delete an instructor
app.delete('/api/instructors/:id', (req, res) => {
  db.prepare('DELETE FROM instructors WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== ROOM ROUTES =====
// Get all rooms
app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms').all()
  res.json(rooms)
})

// ===== SCHEDULE ROUTES =====
// Get schedules without section (draft) - MUST BE BEFORE /api/schedules
app.get('/api/schedules/draft', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      cs.*,
      s.title as subject_title,
      i.fullname as instructor_name
    FROM class_schedule cs
    JOIN subjects s ON cs.subject_id = s.id
    JOIN instructors i ON cs.instructor_id = i.id
    WHERE cs.section IS NULL OR cs.section = ''
    ORDER BY cs.day, cs.time
  `).all()
  res.json(schedules)
})

// Assign section to draft schedules - MUST BE BEFORE /api/schedules
app.put('/api/schedules/assign-section', (req, res) => {
  const { section, ids } = req.body
  const stmt = db.prepare('UPDATE class_schedule SET section = ? WHERE id = ?')
  ids.forEach(id => stmt.run(section, id))
  res.json({ success: true })
})

// Get all schedules
app.get('/api/schedules', (req, res) => {
  const schedules = db.prepare(`
    SELECT 
      cs.*,
      s.title as subject_title,
      i.fullname as instructor_name
    FROM class_schedule cs
    JOIN subjects s ON cs.subject_id = s.id
    JOIN instructors i ON cs.instructor_id = i.id
    ORDER BY cs.section, cs.day, cs.time
  `).all()
  res.json(schedules)
})

// Save a schedule
app.post('/api/schedules', (req, res) => {
  const { subject_id, instructor_id, room_id, type, day, time, section } = req.body
  const stmt = db.prepare(
    'INSERT INTO class_schedule (subject_id, instructor_id, room_id, type, day, time, section) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const result = stmt.run(subject_id, instructor_id, room_id, type, day, time, section)
  res.json({ id: result.lastInsertRowid })
})

// Delete a schedule
app.delete('/api/schedules/:id', (req, res) => {
  db.prepare('DELETE FROM class_schedule WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ===== SECTION ROUTES =====
// Get all unique sections
app.get('/api/sections', (req, res) => {
  const sections = db.prepare(`
    SELECT DISTINCT section, 
    MIN(created_at) as created_at,
    COUNT(*) as total_subjects
    FROM class_schedule 
    WHERE section IS NOT NULL AND section != ''
    GROUP BY section
    ORDER BY created_at DESC
  `).all()
  res.json(sections)
})

// ===== LOGIN =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password)
  if (user) {
    res.json({ success: true, username: user.username })
  } else {
    res.json({ success: false, message: 'Invalid username or password' })
  }
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})