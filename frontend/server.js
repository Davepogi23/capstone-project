import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'

const app = express()
const db = new Database('./class_scheduling.db')

app.use(cors())
app.use(express.json())

// Get all subjects
app.get('/api/subjects', (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects').all()
  res.json(subjects)
})

// Get all instructors
app.get('/api/instructors', (req, res) => {
  const instructors = db.prepare('SELECT * FROM instructors').all()
  res.json(instructors)
})

// Get all rooms
app.get('/api/rooms', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms').all()
  res.json(rooms)
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
  `).all()
  res.json(schedules)
})

// Save a schedule
app.post('/api/schedules', (req, res) => {
  const { subject_id, instructor_id, room_id, type, day, time } = req.body
  const stmt = db.prepare(
    'INSERT INTO class_schedule (subject_id, instructor_id, room_id, type, day, time) VALUES (?, ?, ?, ?, ?, ?)'
  )
  const result = stmt.run(subject_id, instructor_id, room_id, type, day, time)
  res.json({ id: result.lastInsertRowid })
})

// Delete a schedule
app.delete('/api/schedules/:id', (req, res) => {
  db.prepare('DELETE FROM class_schedule WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})