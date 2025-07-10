const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();
const IP = require('./ip');
const pool = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Test database connection and update schema
pool.getConnection()
   .then(async conn => {
     console.log('Database connected successfully');
     
     // Check and add missing columns
     try {
       // Check if edited column exists
       const [columns] = await conn.query(`
         SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = 'university_app' 
         AND TABLE_NAME = 'chat_messages' 
         AND COLUMN_NAME IN ('edited', 'updated_at')
       `);
       
       const existingColumns = columns.map(col => col.COLUMN_NAME);
       
       if (!existingColumns.includes('edited')) {
         await conn.query('ALTER TABLE chat_messages ADD COLUMN edited BOOLEAN DEFAULT FALSE AFTER is_read');
         console.log('✅ Added edited column to chat_messages');
       }
       
       if (!existingColumns.includes('updated_at')) {
         await conn.query('ALTER TABLE chat_messages ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at');
         console.log('✅ Added updated_at column to chat_messages');
       }
       
       console.log('✅ Database schema check completed');
     } catch (error) {
       console.log('ℹ️ Database schema error:', error.message);
     }
     
     conn.release();
   })
   .catch(err => {
     console.error('Database connection failed:', err);
   });

app.use(cors());
app.use(express.json());

// Serve static files
app.use('/uploads', express.static('uploads'));

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const facultyRoutes = require('./routes/faculty');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Use routes
console.log('🔗 Registering routes...');
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
console.log('✅ All routes registered successfully');

// Initialize Chat Socket Handler
const ChatSocket = require('./socket/chatSocket');
const chatSocket = new ChatSocket(io);

// Make chatSocket available globally for routes
global.chatSocket = chatSocket;

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on http://${IP}:${PORT}`);
  console.log('Socket.IO server is ready');
});