const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

// Simple test route to verify routing is working
router.get('/route-test', (req, res) => {
  console.log('🧪 Route test endpoint hit');
  res.json({ message: 'Student routes are working!', timestamp: new Date().toISOString() });
});

// Register student
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branch } = req.body;

    // Check if user already exists
    const [existingUsers] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);

    const [result] = await pool.query(
      'INSERT INTO students (name, email, password, branch, profile_edit) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, branch, false]
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Login student
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM students WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const student = rows[0];
    const isMatch = await bcrypt.compare(password, student.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: student.id, role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: 'student' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get student profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Get all columns from students table
    const [columns] = await pool.query(`SHOW COLUMNS FROM students`);
    const columnNames = columns.map(col => col.Field);

    // Build SELECT query for all columns
    const selectQuery = `SELECT ${columnNames.join(', ')} FROM students WHERE id = ?`;
    const [student] = await pool.query(selectQuery, [req.user.id]);

    if (!student || student.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Parse JSON fields if present
    const s = student[0];
    const parseField = (field) => {
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch {
        return field;
      }
    };

    // List of possible JSON fields (add/remove as per your schema)
    const jsonFields = [
      'personal_details',
      'education',
      'skills',
      'work_experience',
      'projects',
      'certifications',
      'achievements',
      'languages',
      'hobbies',
      'resume_references'
    ];

    jsonFields.forEach(field => {
      if (s[field] !== undefined) {
        s[field] = parseField(s[field]);
      }
    });

    res.json(s);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});

// Get student tasks
router.get('/tasks', auth, async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT t.* FROM tasks t WHERE t.assigned_to = ? AND t.assigned_role = "student"',
      [req.user.id]
    );
    res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get student tickets
router.get('/tickets', auth, async (req, res) => {
  try {
    const [tickets] = await pool.query(
      'SELECT * FROM tickets WHERE raised_by = ?',
      [req.user.id]
    );
    res.json(tickets || []);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.json([]);
  }
});

// Create new ticket
router.post('/tickets', auth, async (req, res) => {
  try {
    const { subject, description } = req.body;
    const [result] = await pool.query(
      'INSERT INTO tickets (subject, description, raised_by, role, status) VALUES (?, ?, ?, "student", "open")',
      [subject, description, req.user.id]
    );
    res.status(201).json({ success: true, ticket_id: result.insertId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create profile update ticket
router.post('/profile-update-ticket', auth, async (req, res) => {
  try {
    const { subject, description, type, requested_updates } = req.body;

    // Set profile_edit to true for the student
    await pool.query(
      'UPDATE students SET profile_edit = ? WHERE id = ?',
      [true, req.user.id]
    );

    // Convert requested_updates to string if it's an object
    const updatesString = typeof requested_updates === 'object' ?
      JSON.stringify(requested_updates) :
      requested_updates;

    // Create ticket
    const [result] = await pool.query(
      'INSERT INTO tickets (subject, description, type, raised_by, role, status, requested_updates) VALUES (?, ?, ?, ?, "student", "pending", ?)',
      [subject, description, type, req.user.id, updatesString]
    );

    res.status(201).json({ message: 'Ticket created successfully', ticketId: result.insertId });
  } catch (error) {
    console.error('Error in profile-update-ticket route:', error);
    res.status(500).json({ message: 'Failed to create ticket', error: error.message });
  }
});

// Update student profile after approval
router.put('/profile', auth, async (req, res) => {
  try {
    const { ticket_id, updates } = req.body;

    // Check if ticket exists and is approved
    const [tickets] = await pool.query(
      'SELECT * FROM tickets WHERE id = ? AND status = "approved" AND type = "profile_update"',
      [ticket_id]
    );

    if (tickets.length === 0) {
      return res.status(403).json({ error: 'No approved ticket found for profile update' });
    }

    // Validate updates object
    if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    // Define allowed fields to prevent SQL injection
    const allowedFields = ['name', 'email', 'branch'];
    const updateFields = Object.keys(updates).filter(field => allowedFields.includes(field));

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Build the SET clause dynamically
    const setClause = updateFields.map(field => `${field} = ?`).join(', ');
    const query = `UPDATE students SET ${setClause}, profile_edit = ? WHERE id = ?`;

    // Collect values for the placeholders
    const values = [...updateFields.map(field => updates[field]), false, req.user.id];

    // Execute the update query
    const [result] = await pool.query(query, values);

    // Mark ticket as completed
    await pool.query(
      'UPDATE tickets SET status = "completed" WHERE id = ?',
      [ticket_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit task
router.post('/tasks/:taskId/submit', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { submission_text } = req.body;

    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    // Validate submission text
    if (!submission_text || !submission_text.trim()) {
      return res.status(400).json({ error: 'Submission text is required' });
    }

    // Check if task exists and is assigned to this student
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND assigned_to = ? AND assigned_role = "student"',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    const task = tasks[0];

    // Check if task is already submitted
    if (task.status === 'submitted' || task.status === 'completed') {
      return res.status(400).json({ error: 'Task has already been submitted' });
    }

    // Update task with submission
    await pool.query(
      'UPDATE tasks SET status = "submitted", submission_text = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?',
      [submission_text.trim(), taskId]
    );

    res.json({ 
      success: true, 
      message: 'Task submitted successfully',
      task_id: taskId,
      status: 'submitted'
    });
  } catch (error) {
    console.error('Error submitting task:', error);
    res.status(500).json({ error: 'Failed to submit task', details: error.message });
  }
});

// GET /api/student/attendance
router.get('/attendance', auth, async (req, res) => {
  try {
    // Filter attendance by the logged-in student
    const [rows] = await pool.query(
      'SELECT * FROM attendance WHERE student_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message });
  }
});

// Debug route to check database structure
router.get('/debug/tables', async (req, res) => {
  try {
    // Check students table structure
    const [studentsColumns] = await pool.query('SHOW COLUMNS FROM students');
    
    // Check if other tables exist
    const [tables] = await pool.query('SHOW TABLES');
    
    const tableNames = tables.map(table => Object.values(table)[0]);
    
    let attendanceColumns = [];
    let tasksColumns = [];
    let ticketsColumns = [];
    
    if (tableNames.includes('attendance')) {
      const [cols] = await pool.query('SHOW COLUMNS FROM attendance');
      attendanceColumns = cols;
    }
    
    if (tableNames.includes('tasks')) {
      const [cols] = await pool.query('SHOW COLUMNS FROM tasks');
      tasksColumns = cols;
    }
    
    if (tableNames.includes('tickets')) {
      const [cols] = await pool.query('SHOW COLUMNS FROM tickets');
      ticketsColumns = cols;
    }
    
    res.json({
      database: 'Connected successfully',
      tables: tableNames,
      students_columns: studentsColumns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default
      })),
      attendance_columns: attendanceColumns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default
      })),
      tasks_columns: tasksColumns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default
      })),
      tickets_columns: ticketsColumns.map(col => ({
        field: col.Field,
        type: col.Type,
        null: col.Null,
        default: col.Default
      }))
    });
  } catch (error) {
    console.error('Database debug error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Chat Routes

// GET /api/student/chat/rooms - Get all chat rooms for student
router.get('/chat/rooms', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const [rooms] = await pool.query(`
      SELECT 
        cr.id as room_id,
        cr.faculty_id,
        f.name as faculty_name,
        f.branch as department,
        f.email as faculty_email,
        cr.created_at,
        cr.updated_at,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.room_id = cr.id AND cm.sender_type = 'faculty' AND cm.is_read = 0) as unread_count,
        (SELECT cm.message FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time
      FROM chat_rooms cr
      JOIN faculty f ON cr.faculty_id = f.id
      WHERE cr.student_id = ?
      ORDER BY cr.updated_at DESC
    `, [req.user.id]);
    
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// POST /api/student/chat/room - Create or get chat room with faculty
router.post('/chat/room', auth, async (req, res) => {
  try {
    console.log(`🏠 Creating chat room - Student: ${req.user.id}, Request body:`, req.body);
    const { faculty_id } = req.body;
    
    if (!faculty_id) {
      console.log('❌ Faculty ID missing');
      return res.status(400).json({ error: 'Faculty ID is required' });
    }

    // Check if room already exists
    console.log(`🔍 Checking for existing room between student ${req.user.id} and faculty ${faculty_id}`);
    let [existingRooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE student_id = ? AND faculty_id = ?',
      [req.user.id, faculty_id]
    );

    let roomId;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
      console.log(`✅ Found existing room: ${roomId}`);
    } else {
      // Create new room
      console.log(`🆕 Creating new room`);
      const [result] = await pool.query(
        'INSERT INTO chat_rooms (student_id, faculty_id) VALUES (?, ?)',
        [req.user.id, faculty_id]
      );
      roomId = result.insertId;
      console.log(`✅ Created new room: ${roomId}`);
    }

    // Get room details with faculty info
    const [roomDetails] = await pool.query(`
      SELECT 
        cr.id as room_id,
        cr.faculty_id,
        f.name as faculty_name,
        f.branch as department,
        f.email as faculty_email,
        cr.created_at
      FROM chat_rooms cr
      JOIN faculty f ON cr.faculty_id = f.id
      WHERE cr.id = ?
    `, [roomId]);

    console.log(`✅ Returning room details:`, roomDetails[0]);
    res.json(roomDetails[0]);
  } catch (error) {
    console.error('❌ Error creating/getting chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// GET /api/student/chat/messages/:roomId - Get messages for a chat room
router.get('/chat/messages/:roomId', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Verify student has access to this room
    const [roomCheck] = await pool.query(
      'SELECT id FROM chat_rooms WHERE id = ? AND student_id = ?',
      [roomId, req.user.id]
    );

    if (roomCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    // Get messages
    const [messages] = await pool.query(`
      SELECT 
        cm.*,
        CASE 
          WHEN cm.sender_type = 'student' THEN s.name
          WHEN cm.sender_type = 'faculty' THEN f.name
        END as sender_name
      FROM chat_messages cm
      LEFT JOIN students s ON cm.sender_id = s.id AND cm.sender_type = 'student'
      LEFT JOIN faculty f ON cm.sender_id = f.id AND cm.sender_type = 'faculty'
      WHERE cm.room_id = ?
      ORDER BY cm.created_at DESC
      LIMIT ? OFFSET ?
    `, [roomId, limit, offset]);

    // Mark messages as read
    await pool.query(
      'UPDATE chat_messages SET is_read = TRUE WHERE room_id = ? AND sender_type = "faculty"',
      [roomId]
    );

    res.json(messages.reverse()); // Reverse to show oldest first
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Video Call Routes

// GET /api/student/video/sessions - Get video sessions for student
router.get('/video/sessions', auth, async (req, res) => {
  try {
    const [sessions] = await pool.query(`
      SELECT 
        vs.*,
        f.name as faculty_name,
        f.department
      FROM video_sessions vs
      JOIN faculty f ON vs.faculty_id = f.id
      WHERE vs.student_id = ?
      ORDER BY vs.created_at DESC
      LIMIT 20
    `, [req.user.id]);
    
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching video sessions:', error);
    res.status(500).json({ error: 'Failed to fetch video sessions' });
  }
});

// GET /api/student/faculty - Get all faculty members for chat
router.get('/faculty', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const [faculty] = await pool.query(`
      SELECT 
        id,
        name,
        email,
        branch as department
      FROM faculty 
      ORDER BY name ASC
    `);
    
    res.json(faculty);
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// GET /api/student/messages - Get all messages for student (inbox)
router.get('/messages', auth, async (req, res) => {
  try {
    // Check if user is a student
    if (req.user.role !== 'student') {
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const [messages] = await pool.query(`
      SELECT 
        cm.*,
        f.name as sender_name,
        f.branch as department,
        cr.faculty_id
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      JOIN faculty f ON cr.faculty_id = f.id
      WHERE cr.student_id = ? AND cm.sender_type = 'faculty'
      ORDER BY cm.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/student/send-message - Send message to faculty
router.post('/send-message', auth, async (req, res) => {
  try {
    console.log('📤 Send message request:', {
      studentId: req.user.id,
      body: req.body,
      userRole: req.user.role
    });

    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('❌ Access denied - not a student');
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const { faculty_id, message, message_type = 'text' } = req.body;
    
    if (!faculty_id || !message) {
      return res.status(400).json({ error: 'Faculty ID and message are required' });
    }

    // Check if faculty exists
    console.log(`🔍 Checking if faculty ${faculty_id} exists`);
    const [facultyCheck] = await pool.query('SELECT id FROM faculty WHERE id = ?', [faculty_id]);
    if (facultyCheck.length === 0) {
      console.log(`❌ Faculty ${faculty_id} not found`);
      return res.status(404).json({ error: 'Faculty not found' });
    }
    console.log(`✅ Faculty ${faculty_id} exists`);

    // Create or get chat room
    let [existingRooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE student_id = ? AND faculty_id = ?',
      [req.user.id, faculty_id]
    );

    let roomId;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
    } else {
      // Create new room
      const [result] = await pool.query(
        'INSERT INTO chat_rooms (student_id, faculty_id) VALUES (?, ?)',
        [req.user.id, faculty_id]
      );
      roomId = result.insertId;
    }

    // Insert message
    const [messageResult] = await pool.query(
      'INSERT INTO chat_messages (room_id, sender_id, sender_type, message, message_type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
      [roomId, req.user.id, 'student', message, message_type, false]
    );

    // Update room timestamp
    await pool.query(
      'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [roomId]
    );

    res.json({ 
      success: true, 
      message_id: messageResult.insertId,
      room_id: roomId 
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/student/message/:messageId/read - Mark message as read
router.put('/message/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Verify the message belongs to a room where the student is a participant
    const [messageCheck] = await pool.query(`
      SELECT cm.id 
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      WHERE cm.id = ? AND cr.student_id = ? AND cm.sender_type = 'faculty'
    `, [messageId, req.user.id]);

    if (messageCheck.length === 0) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    // Mark as read
    await pool.query(
      'UPDATE chat_messages SET is_read = TRUE WHERE id = ?',
      [messageId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// GET /api/student/conversation/:facultyId - Get conversation with specific faculty
router.get('/conversation/:facultyId', auth, async (req, res) => {
  try {
    console.log('🗨️ Conversation request:', {
      studentId: req.user.id,
      facultyId: req.params.facultyId,
      userRole: req.user.role
    });

    // Check if user is a student
    if (req.user.role !== 'student') {
      console.log('❌ Access denied - not a student');
      return res.status(403).json({ error: 'Access denied. Students only.' });
    }

    const { facultyId } = req.params;
    
    // Get or create chat room
    console.log(`🔍 Looking for room between student ${req.user.id} and faculty ${facultyId}`);
    let [existingRooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE student_id = ? AND faculty_id = ?',
      [req.user.id, facultyId]
    );

    let roomId;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
      console.log(`✅ Found existing room: ${roomId}`);
    } else {
      // Create new room if it doesn't exist
      console.log(`🆕 Creating new room`);
      const [result] = await pool.query(
        'INSERT INTO chat_rooms (student_id, faculty_id) VALUES (?, ?)',
        [req.user.id, facultyId]
      );
      roomId = result.insertId;
      console.log(`✅ Created new room: ${roomId}`);
    }

    // Get all messages in this conversation
    console.log(`📨 Fetching messages for room ${roomId}`);
    const [messages] = await pool.query(`
      SELECT 
        cm.*,
        CASE 
          WHEN cm.sender_type = 'faculty' THEN f.name
          WHEN cm.sender_type = 'student' THEN s.name
        END as sender_name
      FROM chat_messages cm
      LEFT JOIN faculty f ON cm.sender_id = f.id AND cm.sender_type = 'faculty'
      LEFT JOIN students s ON cm.sender_id = s.id AND cm.sender_type = 'student'
      WHERE cm.room_id = ?
      ORDER BY cm.created_at ASC
    `, [roomId]);
    
    console.log(`✅ Found ${messages.length} messages for room ${roomId}`);
    
    // Mark faculty messages as read
    await pool.query(
      'UPDATE chat_messages SET is_read = TRUE WHERE room_id = ? AND sender_type = "faculty"',
      [roomId]
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Test endpoint without auth
router.get('/test', (req, res) => {
  res.json({ message: 'Student routes working!' });
});

// Test database tables
router.get('/test-db', async (req, res) => {
  try {
    const [chatRooms] = await pool.query('SELECT COUNT(*) as count FROM chat_rooms');
    const [chatMessages] = await pool.query('SELECT COUNT(*) as count FROM chat_messages');
    const [students] = await pool.query('SELECT COUNT(*) as count FROM students');
    const [faculty] = await pool.query('SELECT COUNT(*) as count FROM faculty');
    
    res.json({
      message: 'Database test successful',
      tables: {
        chat_rooms: chatRooms[0].count,
        chat_messages: chatMessages[0].count,
        students: students[0].count,
        faculty: faculty[0].count
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: 'Database test failed', details: error.message });
  }
});

module.exports = router;