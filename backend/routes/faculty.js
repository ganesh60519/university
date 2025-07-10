const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const auth = require('../middleware/auth');

// Register faculty
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, branch } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    const [result] = await pool.query(
      'INSERT INTO faculty (name, email, password, branch) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, branch]
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login faculty
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM faculty WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const faculty = rows[0];
    const isMatch = await bcrypt.compare(password, faculty.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: faculty.id, role: 'faculty' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: 'faculty' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get faculty profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    console.log(`Fetching profile for faculty ID: ${req.user.id}`);
    
    const [rows] = await pool.query(
      'SELECT id, name, email, branch FROM faculty WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      console.log(`Faculty not found for ID: ${req.user.id}`);
      return res.status(404).json({ error: 'Faculty not found' });
    }

    console.log(`Faculty profile found:`, rows[0]);
    res.json(rows[0]);
  } catch (error) {
    console.error('Faculty profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update faculty profile
router.put('/profile', auth, async (req, res) => {
  try {
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const { profile_picture, name, email, branch, phone } = req.body;
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (profile_picture !== undefined) {
      updateFields.push('profile_picture = ?');
      updateValues.push(profile_picture);
    }
    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (branch !== undefined) {
      updateFields.push('branch = ?');
      updateValues.push(branch);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.user.id);
    
    const query = `UPDATE faculty SET ${updateFields.join(', ')} WHERE id = ?`;
    await pool.query(query, updateValues);

    // Return updated profile
    const [rows] = await pool.query('SELECT * FROM faculty WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated successfully', profile: rows[0] });
  } catch (error) {
    console.error('Error updating faculty profile:', error);
    res.status(500).json({ error: 'Failed to update profile', details: error.message });
  }
});

// Assign task to student
router.post('/assign-task', auth, async (req, res) => {
  const { title, description, student_id, due_date } = req.body;

  if (!title || !description || !student_id || !due_date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    // First, verify that the student exists
    const [studentRows] = await pool.query(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Insert task with assigned_by field
    await pool.query(
      'INSERT INTO tasks (title, description, assigned_to, assigned_role, status, due_date, assigned_by) VALUES (?, ?, ?, "student", "pending", ?, ?)',
      [title, description, student_id, due_date, req.user.id]
    );
    res.status(201).json({ message: 'Task assigned successfully' });
  } catch (error) {
    console.error('Task assignment error:', error);
    res.status(500).json({ 
      error: 'Failed to assign task', 
      details: error.message 
    });
  }
});

// Get list of tasks assigned to students
router.get('/tasks', auth, async (req, res) => {
  try {
    const [tasks] = await pool.query(
      'SELECT t.*, s.name AS student_name FROM tasks t LEFT JOIN students s ON t.assigned_to = s.id WHERE t.assigned_role = "student" AND t.assigned_by = ? ORDER BY t.created_at DESC',
      [req.user.id]
    );
    res.json(tasks || []); // Return empty array if no tasks
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get task submissions (submitted tasks)
router.get('/task-submissions', auth, async (req, res) => {
  try {
    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const [submissions] = await pool.query(
      `SELECT t.*, s.name AS student_name, s.email AS student_email 
       FROM tasks t 
       LEFT JOIN students s ON t.assigned_to = s.id 
       WHERE t.assigned_role = "student" 
       AND t.assigned_by = ? 
       AND t.status IN ("submitted", "completed")
       ORDER BY t.submitted_at DESC`,
      [req.user.id]
    );
    
    res.json(submissions || []);
  } catch (error) {
    console.error('Error fetching task submissions:', error);
    res.status(500).json({ error: 'Failed to fetch task submissions', details: error.message });
  }
});

// Update task status (mark as completed/rejected)
router.put('/tasks/:taskId/status', auth, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, feedback } = req.body;

    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    // Validate status
    const validStatuses = ['completed', 'rejected', 'in_progress', 'pending'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: completed, rejected, in_progress, pending' });
    }

    // Check if task exists and is assigned by this faculty
    const [tasks] = await pool.query(
      'SELECT * FROM tasks WHERE id = ? AND assigned_by = ? AND assigned_role = "student"',
      [taskId, req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned by you' });
    }

    // Update task status and feedback
    const updateQuery = feedback 
      ? 'UPDATE tasks SET status = ?, feedback = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?'
      : 'UPDATE tasks SET status = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?';
    
    const updateParams = feedback 
      ? [status, feedback, taskId]
      : [status, taskId];

    await pool.query(updateQuery, updateParams);

    res.json({ 
      success: true, 
      message: `Task marked as ${status}`,
      task_id: taskId,
      status: status
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status', details: error.message });
  }
});

// Get list of students
router.get('/students', auth, async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id, name FROM students');
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/faculty/mark-attendance
router.post('/mark-attendance', auth, async (req, res) => {
  try {
    const { student_id, semester, subject, status, date, faculty_name } = req.body;
    
    // Validate required fields
    if (!student_id || !semester || !subject || !status || !date || !faculty_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    // Verify student exists
    const [studentRows] = await pool.query(
      'SELECT id FROM students WHERE id = ?',
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check if attendance already marked for this student, subject, and date
    const [existingAttendance] = await pool.query(
      'SELECT id FROM attendance WHERE student_id = ? AND subject = ? AND DATE(date) = DATE(?)',
      [student_id, subject, date]
    );

    if (existingAttendance.length > 0) {
      // Update existing attendance
      await pool.query(
        'UPDATE attendance SET status = ?, faculty_name = ?, semester = ? WHERE student_id = ? AND subject = ? AND DATE(date) = DATE(?)',
        [status, faculty_name, semester, student_id, subject, date]
      );
    } else {
      // Insert new attendance record
      await pool.query(
        'INSERT INTO attendance (student_id, semester, subject, status, faculty_name, date, marked_by, marked_by_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [student_id, semester, subject, status, faculty_name, date, req.user.id, 'faculty']
      );
    }

    res.json({ 
      message: 'Attendance marked successfully',
      student_id,
      subject,
      status,
      date
    });
  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ 
      error: 'Failed to mark attendance', 
      details: error.message 
    });
  }
});

// Add this route for faculty list (for students)
router.get('/list', auth, async (req, res) => {
  try {
    // Adjust column names as per your faculty table schema
    const [rows] = await pool.query(
      'SELECT id, name, email, branch as department FROM faculty'
    );
    res.json(rows || []);
  } catch (error) {
    console.error('Error fetching faculty list:', error);
    res.status(500).json({ error: 'Failed to fetch faculty list' });
  }
});

// ==================== FACULTY CHAT ENDPOINTS ====================

// GET /api/faculty/chat/rooms - Get all chat rooms for faculty
router.get('/chat/rooms', auth, async (req, res) => {
  try {
    console.log(`🏠 Fetching chat rooms for faculty ${req.user.id}`);
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const [rooms] = await pool.query(`
      SELECT 
        cr.id as room_id,
        cr.student_id,
        s.name as student_name,
        s.email as student_email,
        s.branch as student_branch,
        cr.created_at,
        cr.updated_at,
        (SELECT cm.message FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message,
        (SELECT cm.created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM chat_messages cm WHERE cm.room_id = cr.id AND cm.sender_type = 'student' AND cm.is_read = 0) as unread_count
      FROM chat_rooms cr
      JOIN students s ON cr.student_id = s.id
      WHERE cr.faculty_id = ?
      ORDER BY cr.updated_at DESC
    `, [req.user.id]);

    console.log(`✅ Found ${rooms.length} chat rooms for faculty`);
    console.log('📋 Sample room data:', rooms[0]);
    res.json(rooms);
  } catch (error) {
    console.error('❌ Error fetching faculty chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

// POST /api/faculty/chat/room - Create or get chat room with student
router.post('/chat/room', auth, async (req, res) => {
  try {
    console.log(`🏠 Creating chat room - Faculty: ${req.user.id}, Request body:`, req.body);
    const { student_id } = req.body;
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }
    
    if (!student_id) {
      console.log('❌ Student ID missing');
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Check if room already exists
    console.log(`🔍 Checking for existing room between faculty ${req.user.id} and student ${student_id}`);
    let [existingRooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE faculty_id = ? AND student_id = ?',
      [req.user.id, student_id]
    );

    let roomId;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
      console.log(`✅ Found existing room: ${roomId}`);
    } else {
      // Create new room
      console.log(`🆕 Creating new room`);
      const [result] = await pool.query(
        'INSERT INTO chat_rooms (faculty_id, student_id) VALUES (?, ?)',
        [req.user.id, student_id]
      );
      roomId = result.insertId;
      console.log(`✅ Created new room: ${roomId}`);
    }

    // Get room details with student info
    const [roomDetails] = await pool.query(`
      SELECT 
        cr.id as room_id,
        cr.student_id,
        s.name as student_name,
        s.email as student_email,
        cr.created_at
      FROM chat_rooms cr
      JOIN students s ON cr.student_id = s.id
      WHERE cr.id = ?
    `, [roomId]);

    console.log(`✅ Returning room details:`, roomDetails[0]);
    res.json(roomDetails[0]);
  } catch (error) {
    console.error('❌ Error creating/getting chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
});

// GET /api/faculty/chat/messages/:roomId - Get messages for a chat room
router.get('/chat/messages/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`💬 Fetching messages for room ${roomId} by faculty ${req.user.id}`);
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    // Verify faculty has access to this room
    const [roomCheck] = await pool.query(
      'SELECT id FROM chat_rooms WHERE id = ? AND faculty_id = ?',
      [roomId, req.user.id]
    );

    if (roomCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied to this chat room' });
    }

    // Get messages with sender names
    const [messages] = await pool.query(`
      SELECT 
        cm.*,
        CASE 
          WHEN cm.sender_type = 'student' THEN s.name
          WHEN cm.sender_type = 'faculty' THEN f.name
          ELSE 'Unknown'
        END as sender_name
      FROM chat_messages cm
      LEFT JOIN students s ON cm.sender_id = s.id AND cm.sender_type = 'student'
      LEFT JOIN faculty f ON cm.sender_id = f.id AND cm.sender_type = 'faculty'
      WHERE cm.room_id = ?
      ORDER BY cm.created_at ASC
    `, [roomId]);

    // Mark messages as read for faculty
    await pool.query(
      'UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_type = "student"',
      [roomId]
    );

    console.log(`✅ Found ${messages.length} messages for room ${roomId}`);
    res.json(messages);
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// PUT /api/faculty/chat/messages/:messageId - Edit a message
router.put('/chat/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { message } = req.body;
    console.log(`✏️ Editing message ${messageId} by faculty ${req.user.id}`);
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify the message belongs to this faculty
    const [messageCheck] = await pool.query(
      'SELECT id FROM chat_messages WHERE id = ? AND sender_id = ? AND sender_type = "faculty"',
      [messageId, req.user.id]
    );

    if (messageCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied. You can only edit your own messages.' });
    }

    // Update the message
    await pool.query(
      'UPDATE chat_messages SET message = ?, edited = 1, updated_at = NOW() WHERE id = ?',
      [message.trim(), messageId]
    );

    console.log(`✅ Message ${messageId} edited successfully`);
    res.json({ success: true, message: 'Message updated successfully' });
  } catch (error) {
    console.error('❌ Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// DELETE /api/faculty/chat/messages/:messageId - Delete a message
router.delete('/chat/messages/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    console.log(`🗑️ Deleting message ${messageId} by faculty ${req.user.id}`);
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    // Verify the message belongs to this faculty
    const [messageCheck] = await pool.query(
      'SELECT id FROM chat_messages WHERE id = ? AND sender_id = ? AND sender_type = "faculty"',
      [messageId, req.user.id]
    );

    if (messageCheck.length === 0) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own messages.' });
    }

    // Delete the message
    await pool.query('DELETE FROM chat_messages WHERE id = ?', [messageId]);

    console.log(`✅ Message ${messageId} deleted successfully`);
    res.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// POST /api/faculty/chat/broadcast - Broadcast message to all students
router.post('/chat/broadcast', auth, async (req, res) => {
  try {
    const { message, messageType = 'text' } = req.body;
    console.log(`📢 Broadcasting message from faculty ${req.user.id}`);
    
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get all students
    const [students] = await pool.query('SELECT id FROM students');
    
    let successCount = 0;
    const totalStudents = students.length;

    // Create or get chat room with each student and send message
    for (const student of students) {
      try {
        // Check if room exists
        let [existingRooms] = await pool.query(
          'SELECT id FROM chat_rooms WHERE faculty_id = ? AND student_id = ?',
          [req.user.id, student.id]
        );

        let roomId;
        if (existingRooms.length > 0) {
          roomId = existingRooms[0].id;
        } else {
          // Create new room
          const [result] = await pool.query(
            'INSERT INTO chat_rooms (faculty_id, student_id) VALUES (?, ?)',
            [req.user.id, student.id]
          );
          roomId = result.insertId;
        }

        // Send message
        await pool.query(
          'INSERT INTO chat_messages (room_id, sender_id, sender_type, message, message_type) VALUES (?, ?, ?, ?, ?)',
          [roomId, req.user.id, 'faculty', message.trim(), messageType]
        );

        // Update room timestamp
        await pool.query(
          'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [roomId]
        );

        successCount++;
      } catch (error) {
        console.error(`Error broadcasting to student ${student.id}:`, error);
      }
    }

    console.log(`✅ Broadcast sent to ${successCount}/${totalStudents} students`);
    res.json({ 
      message: 'Broadcast sent successfully',
      successCount,
      totalStudents
    });
  } catch (error) {
    console.error('❌ Error broadcasting message:', error);
    res.status(500).json({ error: 'Failed to broadcast message' });
  }
});

// GET /api/faculty/students - Get all students for faculty chat
router.get('/students', auth, async (req, res) => {
  try {
    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const [students] = await pool.query(`
      SELECT 
        id,
        name,
        email,
        branch
      FROM students 
      ORDER BY name ASC
    `);
    
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/faculty/messages - Get all messages from students (inbox)
router.get('/messages', auth, async (req, res) => {
  try {
    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const [messages] = await pool.query(`
      SELECT 
        cm.*,
        s.name as sender_name,
        s.branch,
        cr.student_id as sender_id
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      JOIN students s ON cr.student_id = s.id
      WHERE cr.faculty_id = ? AND cm.sender_type = 'student'
      ORDER BY cm.created_at DESC
      LIMIT 50
    `, [req.user.id]);
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/faculty/send-message - Send message to student
router.post('/send-message', auth, async (req, res) => {
  try {
    // Check if user is faculty
    if (req.user.role !== 'faculty') {
      return res.status(403).json({ error: 'Access denied. Faculty only.' });
    }

    const { student_id, message, message_type = 'text' } = req.body;
    
    if (!student_id || !message) {
      return res.status(400).json({ error: 'Student ID and message are required' });
    }

    // Check if student exists
    const [studentCheck] = await pool.query('SELECT id FROM students WHERE id = ?', [student_id]);
    if (studentCheck.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Create or get chat room
    let [existingRooms] = await pool.query(
      'SELECT id FROM chat_rooms WHERE faculty_id = ? AND student_id = ?',
      [req.user.id, student_id]
    );

    let roomId;
    if (existingRooms.length > 0) {
      roomId = existingRooms[0].id;
    } else {
      // Create new room
      const [result] = await pool.query(
        'INSERT INTO chat_rooms (faculty_id, student_id) VALUES (?, ?)',
        [req.user.id, student_id]
      );
      roomId = result.insertId;
    }

    // Insert message
    const [messageResult] = await pool.query(
      'INSERT INTO chat_messages (room_id, sender_id, sender_type, message, message_type, is_read) VALUES (?, ?, ?, ?, ?, ?)',
      [roomId, req.user.id, 'faculty', message, message_type, false]
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

// PUT /api/faculty/message/:messageId/read - Mark message as read
router.put('/message/:messageId/read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    // Verify the message belongs to a room where the faculty is a participant
    const [messageCheck] = await pool.query(`
      SELECT cm.id 
      FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      WHERE cm.id = ? AND cr.faculty_id = ? AND cm.sender_type = 'student'
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

module.exports = router;