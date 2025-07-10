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
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editedMessage, setEditedMessage] = useState('');
  
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Error handling helper
  const handleError = (error, customMessage = null) => {
    console.error('Chat Error occurred:', error);
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response) {
      errorMessage = error.response.data?.error || error.response.data?.message || `Server error: ${error.response.status}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    setError({
      message: errorMessage,
      customMessage: customMessage || 'Error',
      isSuccess: false
    });
    setErrorDialogVisible(true);
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

      // Decode token to get faculty ID
      const payload = JSON.parse(atob(token.split('.')[1]));
      setFacultyId(payload.id);

      // Fetch faculty info
      const facultyResponse = await axios.get(`http://${IP}:3000/api/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFacultyInfo(facultyResponse.data);

      // Initialize socket connection
      const socket = SocketService.connect(payload.id, 'faculty', token);
      
      SocketService.onNewMessage((messageData) => {
        if (currentRoom && messageData.roomId === (currentRoom.room_id || currentRoom.id)) {
          setMessages(prev => [...prev, messageData]);
          scrollToBottom();
        }
        // Refresh chat rooms to update last message
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

      // Fetch students list and chat rooms
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
      setChatRooms(response.data);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      handleError(error, 'Failed to load chat rooms');
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
      
      // Join the chat room via socket
      console.log('📱 Created/got room:', room);
      SocketService.joinChatRoom(room.room_id || room.id, facultyId, 'faculty');
      
      // Fetch messages for this room
      await fetchMessages(room.room_id || room.id);
      
      // Update chat rooms list
      await fetchChatRooms();
      
    } catch (error) {
      console.error('Error creating chat room:', error);
      handleError(error, 'Failed to start chat');
    }
  };

  const openExistingChat = async (room) => {
    console.log('📱 Opening existing chat:', room);
    setCurrentRoom(room);
    setChatModalVisible(true);
    
    // Join the chat room via socket
    SocketService.joinChatRoom(room.room_id, facultyId, 'faculty');
    
    // Fetch messages for this room
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
      console.error('Error fetching messages:', error);
      handleError(error, 'Failed to load messages');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentRoom || sendingMessage) return;

    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    // Add message to UI immediately for better UX
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
      
      // Remove temp message after successful send
      setMessages(prev => prev.filter(msg => !msg.temp));
    } catch (error) {
      console.error('Error sending message:', error);
      handleError(error, 'Failed to send message');
      setNewMessage(messageText); // Restore message on error
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
      fetchChatRooms(); // Refresh chat rooms
      
    } catch (error) {
      console.error('Error broadcasting message:', error);
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

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
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

      // Update local messages
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { ...msg, message: editedMessage.trim(), edited: true }
          : msg
      ));

      setEditModalVisible(false);
      setEditedMessage('');
      setSelectedMessage(null);

      Alert.alert('Success', 'Message updated successfully');
    } catch (error) {
      console.error('Error editing message:', error);
      Alert.alert('Error', 'Failed to edit message');
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      await axios.delete(`http://${IP}:3000/api/faculty/chat/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove message from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      setSelectedMessage(null);

      Alert.alert('Success', 'Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      Alert.alert('Error', 'Failed to delete message');
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
        
        // Add image message to UI immediately
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

        // Upload and send image
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
            // Remove temp message after successful send
            setMessages(prev => prev.filter(msg => !msg.temp));
          } else {
            throw new Error('Upload failed');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          handleError(uploadError, 'Failed to send image');
          setMessages(prev => prev.filter(msg => !msg.temp));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
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
    const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
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
                  color={item.is_read ? "#4fc3f7" : "#90a4ae"} 
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
    
    return (
      <TouchableOpacity 
        style={[styles.chatItem, unreadCount > 0 && styles.unreadChatItem]}
        onPress={() => openExistingChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.student_name) }]}>
            <Text style={styles.avatarText}>
              {item.student_name ? item.student_name.charAt(0).toUpperCase() : 'S'}
            </Text>
          </View>
          {item.student_online && <View style={styles.onlineIndicator} />}
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
      <MaterialIcons name="chat" size={24} color="#25d366" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#25d366" />
        <Text style={styles.loadingText}>Loading chats...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* WhatsApp-style Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Faculty Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setBroadcastModalVisible(true)}
          >
            <MaterialIcons name="campaign" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
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

      {/* Content Area */}
      {activeTab === 'CHATS' ? (
        /* Chat List */
        <FlatList
          data={chatRooms}
          renderItem={renderChatItem}
          keyExtractor={(item, index) => item?.room_id ? item.room_id.toString() : (item?.id ? item.id.toString() : `chat-${index}`)}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={80} color="#bdc3c7" />
              <Text style={styles.emptyTitle}>No chats yet</Text>
              <Text style={styles.emptyText}>Start a conversation with a student to see chats here</Text>
            </View>
          }
        />
      ) : (
        /* Students List */
        <FlatList
          data={students}
          renderItem={renderStudentItem}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : `student-${index}`}
          style={styles.chatList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="school" size={80} color="#bdc3c7" />
              <Text style={styles.emptyTitle}>No students found</Text>
              <Text style={styles.emptyText}>Students will appear here when available</Text>
            </View>
          }
        />
      )}



      {/* Chat Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={chatModalVisible}
        onRequestClose={() => setChatModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.chatModal}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Chat Header */}
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
            </View>

            <View style={styles.chatHeaderActions}>
              <TouchableOpacity style={styles.chatHeaderButton}>
                <MaterialIcons name="videocam" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatHeaderButton}>
                <MaterialIcons name="call" size={24} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.chatHeaderButton}>
                <MaterialIcons name="more-vert" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Messages List */}
          <View style={styles.messagesContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item, index) => item?.id ? item.id.toString() : `msg-${index}`}
              style={styles.messagesList}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
              ListEmptyComponent={
                <View style={styles.emptyMessagesContainer}>
                  <MaterialIcons name="chat" size={60} color="#bdc3c7" />
                  <Text style={styles.emptyMessagesText}>Start your conversation</Text>
                </View>
              }
            />
          </View>

          {/* Message Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputRow}>
              <TouchableOpacity style={styles.attachButton} onPress={pickImage}>
                <MaterialIcons name="attach-file" size={24} color="#25d366" />
              </TouchableOpacity>
              
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Type a message"
                  placeholderTextColor="#999"
                  value={newMessage}
                  onChangeText={handleTyping}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity style={styles.emojiButton}>
                  <MaterialIcons name="emoji-emotions" size={24} color="#999" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity 
                style={[styles.sendButton, (!newMessage.trim() || sendingMessage) && styles.sendButtonDisabled]}
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
      </Modal>

      {/* Broadcast Modal */}
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
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.broadcastSubtitle}>
              Send a message to all students at once
            </Text>
            
            <TextInput
              style={styles.broadcastInput}
              placeholder="Type your broadcast message here..."
              placeholderTextColor="#999"
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

      {/* Message Options Modal */}
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
              <MaterialIcons name="edit" size={24} color="#25d366" />
              <Text style={styles.messageOptionText}>Edit Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.messageOption}
              onPress={handleDeleteMessage}
            >
              <MaterialIcons name="delete" size={24} color="#e74c3c" />
              <Text style={[styles.messageOptionText, { color: '#e74c3c' }]}>Delete Message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Message Modal */}
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
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.editInput}
              placeholder="Edit your message..."
              placeholderTextColor="#999"
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

      {/* Error Dialog */}
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
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#25d366',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 20,
  },
  tabContainer: {
    backgroundColor: '#25d366',
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#ffffff',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b3e5d1',
  },
  activeTabText: {
    color: '#ffffff',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  unreadChatItem: {
    backgroundColor: '#f8f9fa',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4caf50',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  unreadChatName: {
    fontWeight: '600',
    color: '#000',
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  chatPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  unreadLastMessage: {
    color: '#333',
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: '#25d366',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  studentItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  studentInfo: {
    flex: 1,
    marginLeft: 15,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  studentDetails: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#25d366',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chatModal: {
    flex: 1,
    backgroundColor: '#e5ddd5',
  },
  chatHeader: {
    backgroundColor: '#25d366',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backButton: {
    marginRight: 15,
  },
  chatHeaderInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  chatHeaderStatus: {
    fontSize: 13,
    color: '#b3e5d1',
  },
  chatHeaderActions: {
    flexDirection: 'row',
  },
  chatHeaderButton: {
    marginLeft: 20,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  messagesList: {
    flex: 1,
  },
  dateContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    backgroundColor: '#ffffff',
    color: '#666',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  messageContainer: {
    marginVertical: 2,
    paddingHorizontal: 5,
  },
  ownMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ownBubble: {
    backgroundColor: '#dcf8c6',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
  },
  tempMessage: {
    opacity: 0.7,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25d366',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#333',
  },
  otherMessageText: {
    color: '#333',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginRight: 4,
  },
  ownMessageTime: {
    color: '#666',
  },
  otherMessageTime: {
    color: '#999',
  },
  readIcon: {
    marginLeft: 2,
  },
  emptyMessagesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyMessagesText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 80,
  },
  emojiButton: {
    padding: 4,
    marginLeft: 8,
  },
  sendButton: {
    backgroundColor: '#25d366',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  broadcastModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxHeight: '80%',
  },
  broadcastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  broadcastTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  broadcastSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  broadcastInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    marginBottom: 20,
  },
  broadcastActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  broadcastButton: {
    backgroundColor: '#25d366',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  broadcastButtonDisabled: {
    backgroundColor: '#ccc',
  },
  broadcastButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Message Options Modal Styles
  messageOptionsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 8,
    minWidth: 200,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  messageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  messageOptionText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  // Edit Modal Styles
  editModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#25d366',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  editedText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
});

export default WhatsAppFacultyChatScreen;