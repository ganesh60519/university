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
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { IP } from '../../ip';

const { width } = Dimensions.get('window');

const WhatsAppChatScreen = ({ navigation }) => {
  const [faculty, setFaculty] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState('');

  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentChatFaculty, setCurrentChatFaculty] = useState(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [conversationMessages, setConversationMessages] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  
  const flatListRef = useRef(null);

  useEffect(() => {
    fetchFaculty();
    fetchStudentInfo();
  }, []);

  const fetchStudentInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`http://${IP}:3000/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentInfo(response.data);
    } catch (error) {
      console.error('Error fetching student info:', error);
    }
  };

  const fetchFaculty = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`http://${IP}:3000/api/student/faculty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFaculty(response.data || []);
    } catch (error) {
      console.error('Error fetching faculty:', error);
    }
  };

  const fetchConversationMessages = async (facultyId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`http://${IP}:3000/api/student/conversation/${facultyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversationMessages(response.data || []);
      setTimeout(() => scrollToBottom(), 100);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setConversationMessages([]);
    }
  };

  const handleStartChat = (facultyMember) => {
    setCurrentChatFaculty(facultyMember);
    setChatModalVisible(true);
    fetchConversationMessages(facultyMember.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatFaculty || sendingMessage) return;

    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    // Add message to UI immediately for better UX
    const tempMessage = {
      id: Date.now(),
      message: messageText,
      sender_type: 'student',
      sender_name: studentInfo?.name || 'You',
      created_at: new Date().toISOString(),
      message_type: 'text',
      temp: true
    };
    setConversationMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(), 100);

    try {
      const token = await AsyncStorage.getItem('token');
      const messageData = {
        faculty_id: currentChatFaculty.id,
        message: messageText,
        message_type: 'text'
      };

      await axios.post(`http://${IP}:3000/api/student/send-message`, messageData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove temp message and fetch updated conversation
      setConversationMessages(prev => prev.filter(msg => !msg.temp));
      fetchConversationMessages(currentChatFaculty.id);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setNewMessage(messageText); // Restore message on error
      // Remove temp message on error
      setConversationMessages(prev => prev.filter(msg => !msg.temp));
    } finally {
      setSendingMessage(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please grant permission to access photos');
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
          sender_type: 'student',
          sender_name: studentInfo?.name || 'You',
          created_at: new Date().toISOString(),
          message_type: 'image',
          temp: true
        };
        setConversationMessages(prev => [...prev, tempMessage]);
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
          
          if (uploadResult.success) {
            const messageData = {
              faculty_id: currentChatFaculty.id,
              message: uploadResult.file.url,
              message_type: 'image'
            };

            await axios.post(`http://${IP}:3000/api/student/send-message`, messageData, {
              headers: { Authorization: `Bearer ${token}` }
            });

            // Remove temp message and refresh
            setConversationMessages(prev => prev.filter(msg => !msg.temp));
            fetchConversationMessages(currentChatFaculty.id);
          } else {
            throw new Error('Upload failed');
          }
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert('Error', 'Failed to send image');
          setConversationMessages(prev => prev.filter(msg => !msg.temp));
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && conversationMessages.length > 0) {
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

  const renderMessage = ({ item, index }) => {
    const isOwnMessage = item.sender_type === 'student';
    const showDate = index === 0 || 
      new Date(item.created_at).toDateString() !== new Date(conversationMessages[index - 1].created_at).toDateString();

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
          <View style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownBubble : styles.otherBubble,
            item.temp && styles.tempMessage
          ]}>
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
          </View>
        </View>
      </View>
    );
  };

  const getAvatarColor = (name) => {
    const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    const index = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

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
        <Text style={styles.headerTitle}>Chats</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="search" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialIcons name="more-vert" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Faculty Selection */}
      <View style={styles.facultySelection}>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedFaculty}
            onValueChange={(itemValue) => {
              if (itemValue) {
                const facultyMember = faculty.find(f => f.id.toString() === itemValue);
                if (facultyMember) {
                  handleStartChat(facultyMember);
                  setSelectedFaculty('');
                }
              }
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select faculty to start chat..." value="" />
            {faculty.map((facultyMember) => (
              <Picker.Item 
                key={facultyMember.id} 
                label={`${facultyMember.name} - ${facultyMember.department || 'N/A'}`} 
                value={facultyMember.id.toString()} 
              />
            ))}
          </Picker>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        <View style={styles.welcomeContainer}>
          <MaterialIcons name="chat-bubble-outline" size={100} color="#25d366" />
          <Text style={styles.welcomeTitle}>Welcome to Faculty Chat</Text>
          <Text style={styles.welcomeText}>
            Select a faculty member from the dropdown above to start a conversation.
          </Text>
          <Text style={styles.welcomeSubText}>
            You can chat with your professors, ask questions, and get help with your studies.
          </Text>
        </View>
      </View>

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
              <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(currentChatFaculty?.name || '') }]}>
                <Text style={styles.chatAvatarText}>
                  {currentChatFaculty?.name ? currentChatFaculty.name.charAt(0).toUpperCase() : 'F'}
                </Text>
              </View>
              <View style={styles.chatHeaderText}>
                <Text style={styles.chatHeaderName}>{currentChatFaculty?.name}</Text>
                <Text style={styles.chatHeaderStatus}>
                  {currentChatFaculty?.department || 'Faculty'}
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
              data={conversationMessages}
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
                  onChangeText={setNewMessage}
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
  facultySelection: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 10,
  },
  picker: {
    height: 50,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  welcomeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 15,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  welcomeSubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
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
});

export default WhatsAppChatScreen;