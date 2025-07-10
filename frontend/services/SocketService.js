import io from 'socket.io-client';
import { IP } from '../ip';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  connect(userId, userType, token) {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    // Validate required parameters
    if (!userId || !userType || !token) {
      console.error('❌ Missing required parameters for socket connection');
      return null;
    }

    // Validate IP
    if (!IP) {
      console.error('❌ Server IP is not configured');
      return null;
    }

    try {
      this.socket = io(`http://${IP}:3000`, {
        transports: ['websocket', 'polling'],
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected:', this.socket.id);
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Join user room
        console.log('🔐 Attempting to join with:', { userId, userType, hasToken: !!token });
        this.socket.emit('join', {
          userId,
          userType,
          token
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('⚠️ Socket disconnected:', reason);
        this.isConnected = false;
        
        // Handle different disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          console.log('🔄 Server disconnected, attempting to reconnect...');
        } else if (reason === 'transport close') {
          console.log('🔄 Transport closed, will auto-reconnect...');
        }
      });

      this.socket.on('reconnect', (attemptNumber) => {
        console.log('✅ Socket reconnected after', attemptNumber, 'attempts');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt:', attemptNumber);
        this.reconnectAttempts = attemptNumber;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect after', this.maxReconnectAttempts, 'attempts');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error.message || error);
        this.isConnected = false;
      });

      this.socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      this.socket.on('joined', (data) => {
        console.log('✅ Successfully joined socket:', data);
      });

      return this.socket;
    } catch (error) {
      console.error('❌ Error creating socket connection:', error);
      return null;
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  // Force reconnect method
  forceReconnect(userId, userType, token) {
    console.log('🔄 Force reconnecting socket...');
    this.disconnect();
    setTimeout(() => {
      this.connect(userId, userType, token);
    }, 1000);
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketConnected: this.socket ? this.socket.connected : false,
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket ? this.socket.id : null
    };
  }

  // Chat methods
  joinChatRoom(roomId, userId, userType) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_chat', {
        roomId,
        userId,
        userType
      });
    }
  }

  sendMessage(roomId, senderId, senderType, message, messageType = 'text') {
    if (this.socket && this.isConnected) {
      this.socket.emit('send_message', {
        roomId,
        senderId,
        senderType,
        message,
        messageType
      });
    }
  }

  sendTyping(roomId, userId, userType, isTyping) {
    if (this.socket && this.isConnected) {
      this.socket.emit('typing', {
        roomId,
        userId,
        userType,
        isTyping
      });
    }
  }

  // Event listeners
  onNewMessage(callback) {
    if (this.socket) {
      this.socket.on('new_message', callback);
    }
  }

  onUserTyping(callback) {
    if (this.socket) {
      this.socket.on('user_typing', callback);
    }
  }

  onUserOnline(callback) {
    if (this.socket) {
      this.socket.on('user_online', callback);
    }
  }

  onUserOffline(callback) {
    if (this.socket) {
      this.socket.on('user_offline', callback);
    }
  }

  // Remove listeners
  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();