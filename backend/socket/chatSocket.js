const jwt = require('jsonwebtoken');
const pool = require('../db');

class ChatSocket {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map(); // userId -> { socketId, userType, isOnline }
    this.roomUsers = new Map(); // roomId -> Set of userIds
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('New socket connection:', socket.id);

      // Handle user joining
      socket.on('join', async (data) => {
        try {
          console.log('🔐 Join attempt:', { userId: data?.userId, userType: data?.userType, hasToken: !!data?.token });
          const { userId, userType, token } = data;
          
          if (!token) {
            console.log('❌ No token provided');
            socket.emit('error', { message: 'No token provided' });
            return;
          }
          
          // Verify JWT token
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log('🔓 Token decoded:', { id: decoded.id, role: decoded.role });
          
          if (decoded.id !== userId || decoded.role !== userType) {
            console.log('❌ Token mismatch:', { expected: { userId, userType }, actual: { id: decoded.id, role: decoded.role } });
            socket.emit('error', { message: 'Invalid authentication' });
            return;
          }

          // Store user connection
          this.connectedUsers.set(userId, {
            socketId: socket.id,
            userType,
            isOnline: true,
            lastSeen: new Date()
          });

          socket.userId = userId;
          socket.userType = userType;

          console.log(`✅ ${userType} ${userId} connected with socket ${socket.id}`);
          socket.emit('joined', { message: 'Successfully joined', userId, userType });

        } catch (error) {
          console.error('❌ Join error:', error);
          socket.emit('error', { message: 'Authentication failed' });
        }
      });

      // Handle joining chat rooms
      socket.on('join_chat', async (data) => {
        try {
          const { roomId, userId, userType } = data;
          
          if (!socket.userId || socket.userId !== userId) {
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          // Join the room
          socket.join(`room_${roomId}`);
          
          // Track room users
          if (!this.roomUsers.has(roomId)) {
            this.roomUsers.set(roomId, new Set());
          }
          this.roomUsers.get(roomId).add(userId);

          console.log(`${userType} ${userId} joined room ${roomId}`);

        } catch (error) {
          console.error('Join chat error:', error);
          socket.emit('error', { message: 'Failed to join chat room' });
        }
      });

      // Handle sending messages
      socket.on('send_message', async (data) => {
        try {
          console.log('📨 Received send_message:', data);
          const { roomId, senderId, senderType, message, messageType = 'text' } = data;
          
          // Validate required fields
          if (!roomId || !senderId || !senderType || !message) {
            console.error('❌ Missing required fields:', { roomId, senderId, senderType, message: !!message });
            socket.emit('error', { message: 'Missing required fields' });
            return;
          }
          
          if (!socket.userId || socket.userId !== senderId) {
            console.error('❌ Unauthorized message attempt:', { socketUserId: socket.userId, senderId });
            socket.emit('error', { message: 'Unauthorized' });
            return;
          }

          console.log('💾 Saving message to database...');
          // Save message to database
          const [result] = await pool.query(
            'INSERT INTO chat_messages (room_id, sender_id, sender_type, message, message_type) VALUES (?, ?, ?, ?, ?)',
            [roomId, senderId, senderType, message, messageType]
          );

          console.log('⏰ Updating room timestamp...');
          // Update room timestamp
          await pool.query(
            'UPDATE chat_rooms SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [roomId]
          );

          console.log('👤 Getting sender name...');
          // Get sender name
          const senderName = await this.getSenderName(senderId, senderType);

          // Create message object
          const messageData = {
            id: result.insertId,
            room_id: roomId,
            sender_id: senderId,
            sender_type: senderType,
            sender_name: senderName,
            message,
            message_type: messageType,
            is_read: false,
            created_at: new Date(),
            roomId // For compatibility
          };

          console.log('📡 Broadcasting message to room:', `room_${roomId}`);
          // Broadcast message to room
          this.io.to(`room_${roomId}`).emit('new_message', messageData);

          console.log(`✅ Message sent in room ${roomId} by ${senderType} ${senderId}`);

        } catch (error) {
          console.error('❌ Send message error:', error);
          console.error('❌ Error details:', {
            message: error.message,
            stack: error.stack,
            data: data
          });
          socket.emit('error', { message: 'Failed to send message', details: error.message });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        if (socket.userId) {
          console.log(`${socket.userType} ${socket.userId} disconnected`);
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  async getSenderName(senderId, senderType) {
    try {
      let query;
      if (senderType === 'student') {
        query = 'SELECT name FROM students WHERE id = ?';
      } else if (senderType === 'faculty') {
        query = 'SELECT name FROM faculty WHERE id = ?';
      } else {
        return 'Unknown';
      }

      const [rows] = await pool.query(query, [senderId]);
      return rows.length > 0 ? rows[0].name : 'Unknown';
    } catch (error) {
      console.error('Error getting sender name:', error);
      return 'Unknown';
    }
  }
}

module.exports = ChatSocket;