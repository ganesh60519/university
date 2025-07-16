import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { IP } from '../../ip';
import SocketService from '../../services/SocketService';
import ErrorDialog from '../../components/ErrorDialog';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { useNetwork } from '../../contexts/NetworkContext';

const { width } = Dimensions.get('window');

const WhatsAppFacultyChatScreen = ({ navigation }) => {
  const [students, setStudents] = useState([]);
  const [chatRooms, setChatRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [facultyId, setFacultyId] = useState(null);
  const [facultyInfo, setFacultyInfo] = useState(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('CHATS');
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);
  const [messageOptionsVisible, setMessageOptionsVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [socketError, setSocketError] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  const [pinnedChats, setPinnedChats] = useState([]); // New state for pinned chats

  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Helper function to handle API errors silently
  const handleApiError = (error, operation) => {
    console.error(`Error in ${operation}:`, error);
  };

  // Error handling helper
  const handleError = (error, customMessage = null) => {
    console.error('Chat Error occurred:', error);
    let errorMessage = 'An unexpected error occurred';
    
    const isSocketError = error.message?.includes('socket') || 
                         error.message?.includes('timeout') || 
                         error.message?.includes('websocket') ||
                         error.message?.includes('Socket') ||
                         error.type === 'socket';
    
    if (error.response) {
      errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    if (isSocketError) {
      setSocketError('Connection issue - trying to reconnect...');
      setTimeout(() => setSocketError(null), 4000);
    } else {
      setError({
        message: errorMessage,
        customMessage: customMessage || 'Error',
        isSuccess: false
      });
      setErrorDialogVisible(true);
    }
  };

  // Success handling helper
  const handleSuccess = (message) => {
    console.log('Success:', message);
    setError({
      message: message,
      isSuccess: true,
      customMessage: 'Success'
    });
    setErrorDialogVisible(true);
  };

  const closeErrorDialog = () => {
    setErrorDialogVisible(false);
    setError(null);
  };

  useEffect(() => {
    initializeChat();
    return () => {
      SocketService.disconnect();
    };
  }, []);

  const initializeChat = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userRole = await AsyncStorage.getItem('userRole');
      
      if (!token) {
        handleError({ message: 'Please login again' }, 'Authentication Error');
        navigation.navigate('Login');
        return;
      }

      if (userRole !== 'faculty') {
        handleError({ message: 'Access denied. This is for faculty only.' }, 'Access Denied');
        navigation.goBack();
        return;
      }

      const payload = JSON.parse(atob(token.split('.')[1]));
      setFacultyId(payload.id);

      const facultyResponse = await axios.get(`http://${IP}:3000/api/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacultyInfo(facultyResponse.data);

      const socket = SocketService.connect(payload.id, 'faculty', token);
      
      if (socket) {
        socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          handleError({ message: 'Socket connection timeout', type: 'socket' }, 'Connection Error');
        });
        
        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          if (reason === 'io server disconnect' || reason === 'transport close') {
            handleError({ message: 'Socket disconnected', type: 'socket' }, 'Connection Lost');
          }
        });
        
        socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed');
          handleError({ message: 'Socket reconnection failed', type: 'socket' }, 'Reconnection Failed');
        });
      }
      
      SocketService.onNewMessage((messageData) => {
        if (currentRoom && messageData.roomId === (currentRoom.room_id || currentRoom.id)) {
          setMessages(prev => [
            ...prev.filter(
              msg =>
                !msg.temp ||
                msg.message !== messageData.message ||
                msg.sender_type !== messageData.sender_type
            ),
            messageData
          ]);
          scrollToBottom();
        }
        fetchChatRooms();
      });

      SocketService.onUserTyping((data) => {
        if (data.userType === 'student') {
          setTypingUsers(prev => {
            if (data.isTyping) {
              return [...prev.filter(u => u.userId !== data.userId), data];
            } else {
              return prev.filter(u => u.userId !== data.userId);
            }
          });
        }
      });

      setSocketConnected(true);

      // Load pinned chats from AsyncStorage
      const pinned = await AsyncStorage.getItem('pinnedChats');
      if (pinned) {
        setPinnedChats(JSON.parse(pinned));
      }

      await Promise.all([
        fetchStudents(),
        fetchChatRooms()
      ]);

    } catch (error) {
      console.error('Error initializing chat:', error);
      handleError(error, 'Failed to initialize chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://${IP}:3000/api/faculty/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      handleError(error, 'Failed to load students list');
    }
  };

  const fetchChatRooms = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://${IP}:3000/api/faculty/chat/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort chat rooms: pinned chats first, then by last message time
      const sortedRooms = response.data.sort((a, b) => {
        const aIsPinned = pinnedChats.includes(a.room_id || a.id);
        const bIsPinned = pinnedChats.includes(b.room_id || b.id);
        if (aIsPinned && !bIsPinned) return -1;
        if (!aIsPinned && bIsPinned) return 1;
        return new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0);
      });
      setChatRooms(sortedRooms);
    } catch (error) {
      handleError(error, 'Failed to load chat rooms');
    }
  };

  const togglePinChat = async (roomId) => {
    try {
      let updatedPinnedChats;
      if (pinnedChats.includes(roomId)) {
        updatedPinnedChats = pinnedChats.filter(id => id !== roomId);
      } else {
        updatedPinnedChats = [...pinnedChats, roomId];
      }
      setPinnedChats(updatedPinnedChats);
      await AsyncStorage.setItem('pinnedChats', JSON.stringify(updatedPinnedChats));
      fetchChatRooms(); // Refresh chat rooms to update sorting
      handleSuccess(updatedPinnedChats.includes(roomId) ? 'Chat pinned' : 'Chat unpinned');
    } catch (error) {
      handleError(error, 'Failed to pin/unpin chat');
    }
  };

  const createOrGetChatRoom = async (studentId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(`http://${IP}:3000/api/faculty/chat/room`, 
        { student_id: studentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const room = response.data;
      setCurrentRoom(room);
      setChatModalVisible(true);
      
      SocketService.joinChatRoom(room.room_id || room.id, facultyId, 'faculty');
      await fetchMessages(room.room_id || room.id);
      await fetchChatRooms();
    } catch (error) {
      handleError(error, 'Failed to start chat');
    }
  };

  const openExistingChat = async (room) => {
    setCurrentRoom(room);
    setChatModalVisible(true);
    SocketService.joinChatRoom(room.room_id, facultyId, 'faculty');
    await fetchMessages(room.room_id);
  };

  const fetchMessages = async (roomId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://${IP}:3000/api/faculty/chat/messages/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      handleError(error, 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || sendingMessage) return;

    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    const tempMessage = {
      id: Date.now(),
      message: messageText,
      sender_type: 'faculty',
      sender_id: facultyId,
      sender_name: facultyInfo?.name || 'You',
      created_at: new Date().toISOString(),
      message_type: 'text',
      temp: true
    };
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(), 100);

    try {
      SocketService.sendMessage(
        currentRoom.room_id || currentRoom.id,
        facultyId,
        'faculty',
        messageText,
        'text'
      );
    } catch (error) {
      handleError(error, 'Failed to send message');
      setNewMessage(messageText);
      setMessages(prev => prev.filter(msg => !msg.temp));
    } finally {
      setSendingMessage(false);
    }
  };

  const broadcastToAllStudents = async () => {
    if (!broadcastMessage.trim() || broadcasting) return;

    setBroadcasting(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(`http://${IP}:3000/api/faculty/chat/broadcast`, 
        { 
          message: broadcastMessage.trim(),
          messageType: 'text'
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      handleSuccess(`Message sent to ${response.data.successCount} out of ${response.data.totalStudents} students`);
      setBroadcastMessage('');
      setBroadcastModalVisible(false);
      fetchChatRooms();
    } catch (error) {
      handleError(error, 'Failed to broadcast message');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    
    if (socketConnected && currentRoom) {
      if (!isTyping) {
        setIsTyping(true);
        SocketService.sendTyping(currentRoom.room_id || currentRoom.id, facultyId, 'faculty', true);
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        SocketService.sendTyping(currentRoom.room_id || currentRoom.id, facultyId, 'faculty', false);
      }, 1000);
    }
  };

  const handleMessageLongPress = (message, isOwnMessage) => {
    if (isOwnMessage && !message.temp) {
      setSelectedMessage(message);
      setMessageOptionsVisible(true);
    }
  };

  const handleEditMessage = () => {
    setEditedMessage(selectedMessage.message);
    setMessageOptionsVisible(false);
    setEditModalVisible(true);
  };

  const handleDeleteMessage = () => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMessage(selectedMessage.id)
        }
      ]
    );
    setMessageOptionsVisible(false);
  };

  const editMessage = async () => {
    if (!editedMessage.trim() || !selectedMessage) return;

    try {
      const token = await AsyncStorage.getItem('token');
      await axios.put(`http://${IP}:3000/api/faculty/chat/messages/${selectedMessage.id}`, {
        message: editedMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { ...msg, message: editedMessage.trim(), edited: true }
          : msg
      ));

      setEditModalVisible(false);
      setEditedMessage('');
      setSelectedMessage(null);
    } catch (error) {
      handleApiError(error, 'editMessage');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`http://${IP}:3000/api/faculty/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSelectedMessage(null);
    } catch (error) {
      handleApiError(error, 'deleteMessage');
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        handleError({ message: 'Please grant permission to access photos' }, 'Permission Required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        
        const tempMessage = {
          id: Date.now(),
          message: imageUri,
          sender_type: 'faculty',
          sender_id: facultyId,
          sender_name: facultyInfo?.name || 'You',
          created_at: new Date().toISOString(),
          message_type: 'image',
          temp: true
        };
        setMessages(prev => [...prev, tempMessage]);
        setTimeout(() => scrollToBottom(), 100);

        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: 'image.jpg',
        });

        try {
          const token = await AsyncStorage.getItem('token');
          const uploadResponse = await fetch(`http://${IP}:3000/api/upload/file`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
            body: formData,
          });

          const uploadResult = await uploadResponse.json();
          
          if (uploadResult.success && socketConnected && currentRoom) {
            SocketService.sendMessage(
              currentRoom.room_id || currentRoom.id,
              facultyId,
              'faculty',
              uploadResult.file.url,
              'image'
            );
            setMessages(prev => prev.filter(msg => !msg.temp));
          } else {
            throw new Error('Upload failed');
          }
        } catch (uploadError) {
          handleError(uploadError, 'Failed to send image');
          setMessages(prev => prev.filter(msg => !msg.temp));
        }
      }
    } catch (error) {
      handleError(error, 'Failed to pick image');
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getAvatarColor = (name) => {
    const colors = ['#5b21b6', '#7c3aed', '#a78bfa', '#c4b5fd', '#a5b4fc', '#93c5fd', '#60a5fa', '#3b82f6'];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender_type === 'faculty' && item.sender_id === facultyId;
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(messages[index - 1].created_at).toDateString();

    return (
      <View>
        {showDate && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
          </View>
        )}
        <View style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessageContainer : styles.otherMessageContainer
        ]}>
          <TouchableOpacity
            style={[
              styles.messageBubble,
              isOwnMessage ? styles.ownBubble : styles.otherBubble,
              item.temp && styles.tempMessage
            ]}
            onLongPress={() => handleMessageLongPress(item, isOwnMessage)}
            activeOpacity={0.7}
          >
            {!isOwnMessage && (
              <Text style={styles.senderName}>{item.sender_name}</Text>
            )}
            
            {item.message_type === 'image' ? (
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: item.message.startsWith('http') ? item.message : `http://${IP}:3000${item.message}` }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText
              ]}>
                {item.message}
              </Text>
            )}
            
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {item.edited && <Text style={styles.editedText}>edited • </Text>}
                {formatTime(item.created_at)}
              </Text>
              {isOwnMessage && (
                <MaterialIcons 
                  name="done-all" 
                  size={16} 
                  color={item.is_read ? "#60a5fa" : "#94a3b8"} 
                  style={styles.readIcon}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderChatItem = ({ item }) => {
    const lastMessage = item.last_message || 'No messages yet';
    const unreadCount = item.unread_count || 0;
    const isPinned = pinnedChats.includes(item.room_id || item.id);
    
    return (
      <TouchableOpacity 
        style={[styles.chatItem, unreadCount > 0 && styles.unreadChatItem]}
        onPress={() => openExistingChat(item)}
        onLongPress={() => togglePinChat(item.room_id || item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.student_name) }]}>
            <Text style={styles.avatarText}>
              {item.student_name ? item.student_name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
          {item.student_online && <View style={styles.onlineIndicator} />}
          {isPinned && (
            <MaterialIcons 
              name="push-pin" 
              size={16} 
              color="#a78bfa" 
              style={styles.pinIcon}
            />
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, unreadCount > 0 && styles.unreadChatName]}>
              {item.student_name || 'Student'}
            </Text>
            <Text style={styles.chatTime}>
              {item.last_message_time ? formatTime(item.last_message_time) : ''}
            </Text>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={[styles.lastMessage, unreadCount > 0 && styles.unreadLastMessage]} numberOfLines={1}>
              {lastMessage.length > 30 ? `${lastMessage.substring(0, 30)}...` : lastMessage}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.studentItem}
      onPress={() => createOrGetChatRoom(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.name) }]}>
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'S'}
        </Text>
      </View>
      <View style={styles.studentInfo}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.studentDetails}>{item.rollNo} • {item.branch}</Text>
      </View>
      <MaterialIcons name="chat" size={24} color="#3b82f6" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#ede9fe', '#f5f7fa']}
        style={styles.gradientBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Faculty Chats</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setBroadcastModalVisible(true)}
            >
              <MaterialIcons name="campaign" size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'CHATS' && styles.activeTab]}
            onPress={() => setActiveTab('CHATS')}
          >
            <Text style={[styles.tabText, activeTab === 'CHATS' && styles.activeTabText]}>CHATS</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'STUDENTS' && styles.activeTab]}
            onPress={() => setActiveTab('STUDENTS')}
          >
            <Text style={[styles.tabText, activeTab === 'STUDENTS' && styles.activeTabText]}>STUDENTS</Text>
          </TouchableOpacity>
        </View>

        {socketError && (
          <View style={styles.socketErrorContainer}>
            <MaterialIcons name="wifi-off" size={18} color="#dc2626" />
            <Text style={styles.socketErrorText}>{socketError}</Text>
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={() => setSocketError(null)}
            >
              <MaterialIcons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'CHATS' ? (
          <FlatList
            data={chatRooms}
            renderItem={({ item, index }) => (
              <Animatable.View animation="bounceIn" delay={index * 50} style={styles.chatCardShadow}>
                {renderChatItem({ item })}
              </Animatable.View>
            )}
            keyExtractor={(item, index) => item?.room_id ? item.room_id.toString() : (item?.id ? item.id.toString() : `chat-${index}`)}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="chat-bubble-outline" size={80} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No chats yet</Text>
                <Text style={styles.emptyText}>Start a conversation with a student to see chats here</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        ) : (
          <FlatList
            data={students}
            renderItem={({ item, index }) => (
              <Animatable.View animation="bounceIn" delay={index * 50} style={styles.chatCardShadow}>
                {renderStudentItem({ item })}
              </Animatable.View>
            )}
            keyExtractor={(item, index) => item?.id ? item.id.toString() : `student-${index}`}
            style={styles.chatList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="school" size={80} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No students found</Text>
                <Text style={styles.emptyText}>Students will appear here when available</Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 80 }}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => setBroadcastModalVisible(true)}
        >
          <MaterialIcons name="campaign" size={28} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <Modal
        animationType="slide"
        transparent={false}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <LinearGradient
          colors={['#ede9fe', '#f5f7fa']}
          style={{ flex: 1 }}
        >
          <KeyboardAvoidingView 
            style={styles.chatModal}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setChatModalVisible(false)}
              >
                <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.chatHeaderInfo}>
                <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(currentRoom?.student_name || '') }]}>
                  <Text style={styles.chatAvatarText}>
                    {currentRoom?.student_name ? currentRoom.student_name.charAt(0).toUpperCase() : 'S'}
                  </Text>
                </View>
                <View style={styles.chatHeaderText}>
                  <Text style={styles.chatHeaderName}>{currentRoom?.student_name}</Text>
                  <Text style={styles.chatHeaderStatus}>
                    {typingUsers.length > 0 ? 'typing...' : 'Student'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.pinChatButton}
                  onPress={() => togglePinChat(currentRoom?.room_id || currentRoom?.id)}
                >
                  <MaterialIcons 
                    name={pinnedChats.includes(currentRoom?.room_id || currentRoom?.id) ? "push-pin" : "push-pin-outline"} 
                    size={24} 
                    color="#ffffff"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.messagesContainer}>
              <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={({ item, index }) => (
                  <Animatable.View animation="fadeIn" delay={index * 20}>
                    {renderMessage({ item, index })}
                  </Animatable.View>
                )}
                keyExtractor={(item, index) => item?.id ? item.id.toString() : `msg-${index}`}
                style={styles.messagesList}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={scrollToBottom}
                ListEmptyComponent={
                  <View style={styles.emptyMessagesContainer}>
                    <MaterialIcons name="chat" size={60} color="#94a3b8" />
                    <Text style={styles.emptyMessagesText}>Start your conversation</Text>
                  </View>
                }
                contentContainerStyle={{ paddingBottom: 16 }}
              />
            </View>

            <View style={styles.inputContainerModern}>
              <View style={styles.inputRowModern}>
                <TouchableOpacity style={styles.attachButtonModern} onPress={pickImage}>
                  <MaterialIcons name="attach-file" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <View style={styles.textInputContainerModern}>
                  <TextInput
                    style={styles.textInputModern}
                    placeholder="Type a message"
                    placeholderTextColor="white"
                    value={newMessage}
                    onChangeText={handleTyping}
                    multiline
                    maxLength={1000}
                  />
                  <TouchableOpacity style={styles.emojiButtonModern}>
                    <MaterialIcons name="emoji-emotions" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity 
                  style={[styles.sendButtonModern, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabledModern]}
                  onPress={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <MaterialIcons name="send" size={24} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={broadcastModalVisible}
        onRequestClose={() => setBroadcastModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.broadcastModal}>
            <View style={styles.broadcastHeader}>
              <Text style={styles.broadcastTitle}>Broadcast Message</Text>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.broadcastSubtitle}>
              Send a message to all students at once
            </Text>
            
            <TextInput
              style={styles.broadcastInput}
              placeholder="Type your broadcast message here..."
              placeholderTextColor="#6b7280"
              value={broadcastMessage}
              onChangeText={setBroadcastMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            
            <View style={styles.broadcastActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setBroadcastModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.broadcastButton, (!broadcastMessage.trim() || broadcasting) && styles.broadcastButtonDisabled]}
                onPress={broadcastToAllStudents}
                disabled={!broadcastMessage.trim() || broadcasting}
              >
                {broadcasting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <MaterialIcons name="campaign" size={20} color="#ffffff" />
                    <Text style={styles.broadcastButtonText}>Broadcast</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={messageOptionsVisible}
        onRequestClose={() => setMessageOptionsVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMessageOptionsVisible(false)}
        >
          <View style={styles.messageOptionsModal}>
            <TouchableOpacity 
              style={styles.messageOption}
              onPress={handleEditMessage}
            >
              <MaterialIcons name="edit" size={24} color="#3b82f6" />
              <Text style={styles.messageOptionText}>Edit Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.messageOption}
              onPress={handleDeleteMessage}
            >
              <MaterialIcons name="delete" size={24} color="#ef4444" />
              <Text style={[styles.messageOptionText, { color: '#ef4444' }]}>Delete Message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Message</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <MaterialIcons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.editInput}
              placeholder="Edit your message..."
              placeholderTextColor="#6b7280"
              value={editedMessage}
              onChangeText={setEditedMessage}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            
            <View style={styles.editActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, !editedMessage.trim() && styles.saveButtonDisabled]}
                onPress={editMessage}
                disabled={!editedMessage.trim()}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ErrorDialog
        visible={errorDialogVisible}
        onClose={closeErrorDialog}
        error={error}
        title={error?.isSuccess ? "Success" : error?.customMessage || "Error"}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#5b21b6',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 20,
  },
  tabContainer: {
    backgroundColor: '#5b21b6',
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c4b5fd',
  },
  activeTabText: {
    color: '#ffffff',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  unreadChatItem: {
    backgroundColor: '#ede9fe',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  pinIcon: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  unreadChatName: {
    fontWeight: '700',
    color: 'green',
  },
  chatTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 15,
    color: '#6b7280',
  },
  unreadLastMessage: {
    color: '#374151',
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#a78bfa',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  studentItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 16,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  studentDetails: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4b5563',
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#3b82f6',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  chatModal: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  chatHeader: {
    backgroundColor: '#5b21b6',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  backButton: {
    marginRight: 16,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: '#c4b5fd',
  },
  pinChatButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messagesList: {
    flex: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateText: {
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  messageContainer: {
    marginVertical: 3,
    paddingHorizontal: 8,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.78,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    position: 'relative',
    marginBottom: 4,
  },
  ownBubble: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 6,
    marginRight: 12,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 6,
    marginLeft: 12,
  },
  tempMessage: {
    opacity: 0.8,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5b21b6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownMessageText: {
    color: '#ffffff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  imageContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 14,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 12,
    marginRight: 6,
  },
  ownMessageTime: {
    color: '#d1d5db',
  },
  otherMessageTime: {
    color: '#6b7280',
  },
  readIcon: {
    marginLeft: 4,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  inputContainerModern: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  inputRowModern: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  attachButtonModern: {
    padding: 10,
    marginRight: 6,
  },
  textInputContainerModern: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 120,
  },
  textInputModern: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    maxHeight: 100,
    backgroundColor: 'transparent',
  },
  emojiButtonModern: {
    padding: 6,
    marginLeft: 8,
  },
  sendButtonModern: {
    backgroundColor: '#3b82f6',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  sendButtonDisabledModern: {
    backgroundColor: '#d1d5db',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  broadcastModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: width * 0.92,
    maxHeight: '80%',
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  broadcastTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  broadcastSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 20,
  },
  broadcastInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    minHeight: 140,
    marginBottom: 20,
  },
  broadcastActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  broadcastButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  broadcastButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  broadcastButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageOptionsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    minWidth: 220,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  messageOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#1f2937',
  },
  editModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '92%',
    maxWidth: 420,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#6b7280',
  },
  gradientBackground: {
    flex: 1,
  },
  chatCardShadow: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socketErrorContainer: {
    backgroundColor: '#fee2e2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  socketErrorText: {
    flex: 1,
    fontSize: 14,
    color: '#991b1b',
    marginLeft: 10,
    fontWeight: '500',
  },
  dismissButton: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: '#fecaca',
  },
});

export default WhatsAppFacultyChatScreen;