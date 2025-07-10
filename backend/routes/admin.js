const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../db');
const auth = require('../middleware/auth');



// Register admin
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 8);

    const [result] = await pool.query(
      'INSERT INTO admin (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login admin
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM admin WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const admin = rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, role: 'admin' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all users
router.get('/users', auth, async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id, name, email, branch, profile_edit FROM students');
    const [faculty] = await pool.query('SELECT id, name, email, branch FROM faculty');
    
    res.json({ students, faculty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tasks
router.get('/tasks', auth, async (req, res) => {
  try {
    const [tasks] = await pool.query('SELECT * FROM tasks');
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all tickets
router.get('/tickets', auth, async (req, res) => {
  try {
    const [tickets] = await pool.query(
      'SELECT t.*, s.name AS raised_by_name FROM tickets t LEFT JOIN students s ON t.raised_by = s.id ORDER BY t.created_at DESC'
    );
    res.json(tickets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
});

// Handle profile update ticket (approve or reject)
router.put('/profile-update-tickets/:id', auth, async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    const ticketId = req.params.id;

    // Fetch ticket to get raised_by
    const [tickets] = await pool.query(
      'SELECT raised_by FROM tickets WHERE id = ? AND type = "profile_update"',
      [ticketId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    if (action === 'approve') {
      // Update ticket status to approved
      await pool.query(
        'UPDATE tickets SET status = ?, response = ? WHERE id = ?',
        ['approved', 'Profile update approved', ticketId]
      );
    } else if (action === 'reject') {
      // Update ticket status to closed and reset profile_edit
      await pool.query(
        'UPDATE tickets SET status = ?, response = ? WHERE id = ?',
        ['closed', 'Profile update rejected', ticketId]
      );
      await pool.query(
        'UPDATE students SET profile_edit = ? WHERE id = ?',
        [false, ticket.raised_by]
      );
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Resolve ticket
router.put('/tickets/:id/resolve', auth, async (req, res) => {
  try {
    const { status, response } = req.body;
    const [result] = await pool.query(
      'UPDATE tickets SET status = ?, response = ? WHERE id = ?',
      [status, response, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes working' });
});

// Get admin profile
router.get('/profile', auth, async (req, res) => {
  try {
    console.log('Admin profile endpoint hit');
    console.log('User from token:', req.user);
    
    if (req.user.role !== 'admin') {
      console.log('Access denied - user role:', req.user.role);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('Querying admin with ID:', req.user.id);
    const [rows] = await pool.query(
      'SELECT id, name, email FROM admin WHERE id = ?',
      [req.user.id]
    );

    console.log('Query result:', rows);

    if (rows.length === 0) {
      console.log('No admin found with ID:', req.user.id);
      return res.status(404).json({ error: 'Admin profile not found' });
    }

    const admin = rows[0];
    console.log('Returning admin data:', admin);
    
    res.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: 'admin'
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile', details: error.message });
  }
});



// Assign task to faculty
router.post('/assign-faculty-task', auth, async (req, res) => {
  try {
    const { faculty_id, title, description, due_date } = req.body;
    
    const [result] = await pool.query(
      'INSERT INTO tasks (title, description, assigned_by, assigned_to, role, due_date) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, req.user.id, faculty_id, 'faculty', due_date]
    );

    res.status(201).json({ success: true, task_id: result.insertId });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
