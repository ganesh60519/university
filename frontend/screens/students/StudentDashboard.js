import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert, Image, TextInput, Animated, Dimensions, RefreshControl, StatusBar, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons, FontAwesome5, AntDesign, Feather } from '@expo/vector-icons';
import axios from 'axios';
import { IP } from '../../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import WhatsAppChatScreen from './WhatsAppChatScreen';
import ErrorBoundary from '../../components/ErrorBoundary';
import { LinearGradient } from 'expo-linear-gradient';

const Tab = createBottomTabNavigator();

// Home Screen Component
const HomeScreen = (props) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = props.navigation;
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          if (isMounted) {
            console.log('No authentication token found');
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        if (!IP) {
          console.log('Server IP is not set');
          if (isMounted) {
            setProfile(null);
            setLoading(false);
          }
          return;
        }
        const url = `http://${IP}:3000/api/student/profile`;
        console.log('Fetching profile from:', url);
        
        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        
        if (isMounted) {
          setProfile(response.data);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Profile fetch error:', error);
          const defaultProfile = {
            name: 'Loading...',
            email: 'Loading...',
            branch: 'Loading...',
          };
          setProfile(defaultProfile);
          if (error.response && error.response.status !== 404) {
            let msg = 'Unable to load complete profile data';
            if (error.response.data && error.response.data.error) {
              msg += ': ' + error.response.data.error;
            }
            console.log('Profile error:', msg);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          // Start animations after loading
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            })
          ]).start();
        }
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const token = await AsyncStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`http://${IP}:3000/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        });
        setProfile(response.data);
      } catch (error) {
        console.error('Refresh error:', error);
      }
    }
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#3B82F6', '#1E40AF']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading Dashboard...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
      <ScrollView 
        contentContainerStyle={styles.homeContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <LinearGradient
          colors={['#3B82F6', '#1E40AF']}
          style={styles.headerGradient}
        >
          <Animated.View style={[styles.headerContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.greetingText}>{getCurrentGreeting()}</Text>
            <Text style={styles.studentName}>{profile?.name || 'Student'}</Text>
            <Text style={styles.universityText}>Mahatma Gandhi University</Text>
            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeItem}>
                <Feather name="calendar" size={16} color="#FFFFFF" />
                <Text style={styles.dateTimeText}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
              <View style={styles.dateTimeItem}>
                <Feather name="clock" size={16} color="#FFFFFF" />
                <Text style={styles.dateTimeText}>
                  {new Date().toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>
            </View>
          </Animated.View>
        </LinearGradient>

        {/* Student Information Card */}
        <Animated.View style={[styles.infoCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.infoCardContent}>
            <View style={styles.infoHeader}>
              <MaterialIcons name="person" size={24} color="#3B82F6" />
              <Text style={styles.infoTitle}>Student Profile</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{profile?.name || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Branch</Text>
              <Text style={styles.infoValue}>{profile?.branch || '-'}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Resume Button */}
        <Animated.View style={[styles.resumeButtonContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => navigation.navigate('Resume')}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#3B82F6', '#1E40AF']}
              style={styles.resumeButtonGradient}
            >
              <MaterialIcons name="description" size={24} color="#FFFFFF" />
              <Text style={styles.resumeButtonText}>Build Your Resume</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Access Cards */}
        <Animated.View style={[styles.quickAccessContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.quickAccessTitle}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Chat')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.quickAccessGradient}
              >
                <MaterialIcons name="chat" size={24} color="#FFFFFF" />
                <Text style={styles.quickAccessText}>Chat</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Tickets')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.quickAccessGradient}
              >
                <MaterialIcons name="confirmation-number" size={24} color="#FFFFFF" />
                <Text style={styles.quickAccessText}>Tickets</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Attendance')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#1E40AF']}
                style={styles.quickAccessGradient}
              >
                <MaterialIcons name="calendar-today" size={24} color="#FFFFFF" />
                <Text style={styles.quickAccessText}>Attendance</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickAccessCard}
              onPress={() => navigation.navigate('Tasks')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#EF4444', '#B91C1C']}
                style={styles.quickAccessGradient}
              >
                <MaterialIcons name="assignment" size={24} color="#FFFFFF" />
                <Text style={styles.quickAccessText}>Tasks</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Statistics Cards */}
        <Animated.View style={[styles.statsContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#3B82F6', '#1E40AF']} style={styles.statGradient}>
                <Feather name="trending-up" size={24} color="#FFFFFF" />
                <Text style={styles.statNumber}>92%</Text>
                <Text style={styles.statLabel}>Overall Score</Text>
              </LinearGradient>
            </View>
            <View style={styles.statCard}>
              <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.statGradient}>
                <Feather name="award" size={24} color="#FFFFFF" />
                <Text style={styles.statNumber}>15</Text>
                <Text style={styles.statLabel}>Achievements</Text>
              </LinearGradient>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </>
  );
};

// Tasks Screen Component
const TasksScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submissionModalVisible, setSubmissionModalVisible] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitTask = async (taskId, submissionText) => {
    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Authentication token not found');
        return;
      }

      const response = await axios.post(
        `http://${IP}:3000/api/student/tasks/${taskId}/submit`,
        { submission_text: submissionText },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: 'submitted', submission_text: submissionText } : task
          )
        );
        Alert.alert('Success', 'Task submitted successfully!');
        setSubmissionModalVisible(false);
        setSubmissionText('');
        setModalVisible(false);
        fetchTasks();
      }
    } catch (error) {
      console.error('Error submitting task:', error);
      let errorMessage = 'Failed to submit task';
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = 'Task not found';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please login again';
            break;
          case 403:
            errorMessage = 'You do not have permission to submit this task';
            break;
          case 400:
            errorMessage = error.response.data?.error || 'Invalid submission';
            break;
          default:
            errorMessage = error.response.data?.error || errorMessage;
        }
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskSubmit = () => {
    if (!submissionText.trim()) {
      Alert.alert('Error', 'Please enter your submission text');
      return;
    }
    submitTask(selectedTask.id, submissionText.trim());
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for tasks');
        setTasks([]);
        return;
      }
      
      const response = await axios.get(`http://${IP}:3000/api/student/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      const tasksData = Array.isArray(response.data) ? response.data : [];
      const validTasks = tasksData.filter(task => task && typeof task === 'object');
      setTasks(validTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
      if (error.response && error.response.status !== 404 && error.response.status !== 401) {
        console.log('Tasks fetch error:', error.response.data?.error || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderTask = ({ item }) => {
    if (!item) return null;
    
    const getStatusColor = (status) => {
      switch(status?.toLowerCase()) {
        case 'completed': return ['#10b981', '#059669'];
        case 'submitted': return ['#f59e0b', '#d97706'];
        case 'pending': return ['#ef4444', '#dc2626'];
        default: return ['#6b7280', '#4b5563'];
      }
    };

    const getStatusIcon = (status) => {
      switch(status?.toLowerCase()) {
        case 'completed': return 'check-circle';
        case 'submitted': return 'upload';
        case 'pending': return 'clock';
        default: return 'help-circle';
      }
    };
    
    return (
      <TouchableOpacity 
        style={styles.taskCard}
        onPress={() => {
          setSelectedTask(item);
          setModalVisible(true);
        }}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.taskCardGradient}
        >
          <View style={styles.taskHeader}>
            <View style={styles.taskIconContainer}>
              <MaterialIcons name="assignment" size={24} color="#3B82F6" />
            </View>
            <View style={styles.taskStatusBadge}>
              <LinearGradient
                colors={getStatusColor(item.status)}
                style={styles.statusBadgeGradient}
              >
                <Feather name={getStatusIcon(item.status)} size={12} color="#FFFFFF" />
                <Text style={styles.statusBadgeText}>{item.status || 'Unknown'}</Text>
              </LinearGradient>
            </View>
          </View>
          
          <Text style={styles.taskTitle}>{item.title || 'Untitled Task'}</Text>
          
          <View style={styles.taskDetails}>
            <View style={styles.taskDetailRow}>
              <Feather name="calendar" size={16} color="#64748B" />
              <Text style={styles.taskDetailText}>
                Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No due date'}
              </Text>
            </View>
            
            <View style={styles.taskDetailRow}>
              <Feather name="user" size={16} color="#64748B" />
              <Text style={styles.taskDetailText}>
                By: {item.assigned_by || 'Unknown'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.tasksContainer}>
      <LinearGradient
        colors={['#3B82F6', '#1E40AF']}
        style={styles.tasksHeader}
      >
        <Text style={styles.tasksHeaderTitle}>My Tasks</Text>
        <Text style={styles.tasksHeaderSubtitle}>Stay organized and productive</Text>
      </LinearGradient>
      
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Loading tasks...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : `task-${index}`}
          style={styles.tasksList}
          contentContainerStyle={styles.tasksListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyTasksContainer}>
              <View style={styles.emptyTasksIcon}>
                <MaterialIcons name="assignment" size={60} color="#E2E8F0" />
              </View>
              <Text style={styles.emptyTasksText}>No tasks available</Text>
              <Text style={styles.emptyTasksSubtext}>New tasks will appear here when assigned</Text>
            </View>
          }
        />
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            {selectedTask && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTask.title || 'Untitled Task'}</Text>
                <Text style={styles.modalText}>Description: {selectedTask.description || 'No description'}</Text>
                <Text style={styles.modalText}>
                  Due Date: {selectedTask.due_date ? new Date(selectedTask.due_date).toLocaleDateString() : 'No due date'}
                </Text>
                <Text style={[styles.modalText, { 
                  color: selectedTask.status === 'completed' ? '#16a34a' : 
                         selectedTask.status === 'submitted' ? '#f59e0b' : '#dc2626' 
                }]}>
                  Status: {selectedTask.status || 'Unknown'}
                </Text>
                <Text style={styles.modalText}>Assigned By: {selectedTask.assigned_by || 'Unknown'}</Text>
                
                {selectedTask.submission_text && (
                  <>
                    <Text style={styles.modalText}>Your Submission:</Text>
                    <Text style={[styles.modalText, { fontStyle: 'italic', backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8 }]}>
                      {selectedTask.submission_text}
                    </Text>
                  </>
                )}

                {selectedTask.feedback && (
                  <>
                    <Text style={styles.modalText}>Faculty Feedback:</Text>
                    <Text style={[styles.modalText, { fontStyle: 'italic', backgroundColor: '#fef3c7', padding: 10, borderRadius: 8 }]}>
                      {selectedTask.feedback}
                    </Text>
                  </>
                )}

                <View style={styles.modalButtons}>
                  {selectedTask.status !== 'submitted' && selectedTask.status !== 'completed' && (
                    <TouchableOpacity
                      style={[styles.closeButton, { backgroundColor: '#10b981', marginRight: 8 }]}
                      onPress={() => {
                        setSubmissionModalVisible(true);
                      }}
                    >
                      <Text style={styles.buttonText}>Submit Task</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={submissionModalVisible}
        onRequestClose={() => setSubmissionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Submit Task</Text>
            <Text style={styles.modalText}>Task: {selectedTask?.title}</Text>
            
            <TextInput
              style={[styles.textArea, { height: 200, textAlignVertical: 'top' }]}
              placeholder="Enter your submission here..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={8}
              value={submissionText}
              onChangeText={setSubmissionText}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: '#f43f5e', marginRight: 8 }]}
                onPress={() => {
                  setSubmissionModalVisible(false);
                  setSubmissionText('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: '#10b981' }]}
                onPress={handleTaskSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Tickets Screen Component
const TicketsScreen = () => {
  const navigation = useNavigation();
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for tickets');
        setTickets([]);
        return;
      }
      
      const response = await axios.get(`http://${IP}:3000/api/student/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      const ticketsData = Array.isArray(response.data) ? response.data : [];
      const validTickets = ticketsData.filter(ticket => ticket && typeof ticket === 'object');
      setTickets(validTickets);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      if (error.response && error.response.status !== 404 && error.response.status !== 401) {
        console.log('Tickets fetch error:', error.response.data?.error || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderTicket = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          setSelectedTicket(item);
          setModalVisible(true);
        }}
      >
        <Text style={styles.title}>{item.subject || 'Untitled Ticket'}</Text>
        <Text style={[styles.detailText, { color: item.status === 'Resolved' ? '#16a34a' : '#dc2626' }]}>
          Status: {item.status || 'Unknown'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : `ticket-${index}`}
          style={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>No tickets available</Text>}
        />
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            {selectedTicket && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTicket.subject || 'Untitled Ticket'}</Text>
                <Text style={styles.modalText}>Description: {selectedTicket.description || 'No description'}</Text>
                <Text style={styles.modalText}>Status: {selectedTicket.status || 'Unknown'}</Text>
                {selectedTicket.response && (
                  <Text style={styles.modalText}>Response: {selectedTicket.response}</Text>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Attendance Screen Component
const AttendanceScreen = () => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState({
    totalClasses: 0,
    presentCount: 0,
    absentCount: 0,
    attendancePercentage: 0
  });
  const [viewMode, setViewMode] = useState('summary');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const calculateSummary = (records) => {
    if (!Array.isArray(records)) {
      console.warn('Invalid records data for attendance summary');
      setAttendanceSummary({
        totalClasses: 0,
        presentCount: 0,
        absentCount: 0,
        attendancePercentage: 0
      });
      return;
    }

    const totalClasses = records.length;
    const presentCount = records.filter(record => 
      record && record.status && record.status.toLowerCase() === 'present'
    ).length;
    const absentCount = records.filter(record => 
      record && record.status && record.status.toLowerCase() === 'absent'
    ).length;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
    
    setAttendanceSummary({
      totalClasses,
      presentCount,
      absentCount,
      attendancePercentage
    });
  };

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for attendance');
        setAttendanceRecords([]);
        return;
      }
      
      const response = await axios.get(`http://${IP}:3000/api/student/attendance`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      const attendanceData = Array.isArray(response.data) ? response.data : [];
      const validRecords = attendanceData.filter(record => record && typeof record === 'object');
      setAttendanceRecords(validRecords);
      calculateSummary(validRecords);
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setAttendanceRecords([]);
      calculateSummary([]);
      if (error.response && error.response.status !== 404 && error.response.status !== 401) {
        console.log('Attendance fetch error:', error.response.data?.error || error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderAttendanceRecord = ({ item }) => {
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={styles.attendanceCard}
        onPress={() => {
          setSelectedRecord(item);
          setModalVisible(true);
        }}
      >
        <View style={styles.attendanceCardHeader}>
          <Text style={styles.attendanceTitle}>{item.subject || 'Unknown Subject'}</Text>
        </View>
        <View style={styles.attendanceCardBody}>
          <Text style={styles.attendanceDetailText}>Semester: {item.semester || 'N/A'}</Text>
          <Text style={[styles.attendanceDetailText, { 
            color: item.status && item.status.toLowerCase() === 'present' ? '#16a34a' : '#dc2626',
            fontWeight: '600'
          }]}>
            Status: {item.status || 'Unknown'}
          </Text>
          <Text style={styles.attendanceDetailText}>
            Date: {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Unknown Date'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.attendanceContainer}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loaderText}>Loading Attendance...</Text>
        </View>
      ) : (
        <>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'summary' && styles.toggleButtonActive]}
              onPress={() => setViewMode('summary')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'summary' && styles.toggleButtonTextActive]}>
                Summary
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, viewMode === 'details' && styles.toggleButtonActive]}
              onPress={() => setViewMode('details')}
            >
              <Text style={[styles.toggleButtonText, viewMode === 'details' && styles.toggleButtonTextActive]}>
                Details
              </Text>
            </TouchableOpacity>
          </View>
          {viewMode === 'summary' ? (
            <View style={styles.attendanceSummaryCard}>
              <Text style={styles.summaryTitle}>Attendance Summary</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{attendanceSummary.totalClasses}</Text>
                  <Text style={styles.summaryLabel}>Total Classes</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: '#16a34a' }]}>{attendanceSummary.presentCount}</Text>
                  <Text style={styles.summaryLabel}>Present</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryNumber, { color: '#dc2626' }]}>{attendanceSummary.absentCount}</Text>
                  <Text style={styles.summaryLabel}>Absent</Text>
                </View>
              </View>
              <View style={styles.percentageContainer}>
                <Text style={[styles.percentageText, { 
                  color: attendanceSummary.attendancePercentage >= 75 ? '#16a34a' : 
                         attendanceSummary.attendancePercentage >= 50 ? '#f59e0b' : '#dc2626' 
                }]}>
                  {attendanceSummary.attendancePercentage}% Attendance
                </Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { 
                    width: `${attendanceSummary.attendancePercentage}%`,
                    backgroundColor: attendanceSummary.attendancePercentage >= 75 ? '#16a34a' : 
                                   attendanceSummary.attendancePercentage >= 50 ? '#f59e0b' : '#dc2626'
                  }]} />
                </View>
              </View>
            </View>
          ) : (
            <FlatList
              data={attendanceRecords}
              renderItem={renderAttendanceRecord}
              keyExtractor={(item, index) => item?.id ? item.id.toString() : `attendance-${index}`}
              style={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.attendanceEmptyText}>📅 No attendance records available</Text>
                  <Text style={styles.emptySubText}>Your attendance will appear here once marked by faculty</Text>
                </View>
              }
            />
          )}
        </>
      )}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.attendanceModal}>
          <View style={styles.attendanceModalView}>
            {selectedRecord && (
              <ScrollView>
                <Text style={styles.modalTitleAttendance}>{selectedRecord.subject || 'Unknown Subject'}</Text>
                <View style={styles.modalDivider} />
                <Text style={styles.modalTextAttendance}>Semester: {selectedRecord.semester || 'N/A'}</Text>
                <Text style={styles.modalTextAttendance}>Subject: {selectedRecord.subject || 'Unknown Subject'}</Text>
                <Text style={styles.modalTextAttendance}>
                  Date: {selectedRecord.created_at ? new Date(selectedRecord.created_at).toLocaleDateString() : 'Unknown Date'}
                </Text>
                <Text style={styles.modalTextAttendance}>Marked By: {selectedRecord.marked_by || 'Unknown'}</Text>
                <Text style={[styles.modalTextAttendance, { 
                  color: selectedRecord.status && selectedRecord.status.toLowerCase() === 'present' ? '#16a34a' : '#dc2626',
                  fontWeight: '600'
                }]}>Status: {selectedRecord.status || 'Unknown'}</Text>
                <TouchableOpacity
                  style={styles.closeButtonAttendance}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Profile Screen Component
const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [ticketStatus, setTicketStatus] = useState(null);
  const [approvedTicketId, setApprovedTicketId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150.png?text=Profile');

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          fetchProfile();
          fetchProfileUpdateTickets();
        } else {
          console.error('No authentication token found');
          Alert.alert('Error', 'You are not logged in. Please log in again.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };
    checkToken();
    loadProfileImage();
  }, []);

  const loadProfileImage = async () => {
    try {
      const savedImage = await AsyncStorage.getItem('profileImage');
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Permission Denied', 'Permission to access gallery is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      await AsyncStorage.setItem('profileImage', imageUri);
    }
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for profile fetch');
        setProfile(null);
        return;
      }
      
      const response = await axios.get(`http://${IP}:3000/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      const defaultProfile = {
        name: 'Unable to load',
        email: 'Unable to load',
        branch: 'Unable to load'
      };
      setProfile(defaultProfile);
      if (error.response) {
        if (error.response.status === 401) {
          console.log('Authentication expired');
        } else if (error.response.status === 404) {
          console.log('Profile not found');
        } else {
          console.log('Profile fetch error:', error.response.data?.error || 'Unknown error');
        }
      } else if (error.request) {
        console.log('Network error - could not connect to server');
      } else {
        console.log('Request setup failed:', error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfileUpdateTickets = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('No token available for tickets fetch');
        setTicketStatus(null);
        setApprovedTicketId(null);
        return;
      }
      
      const response = await axios.get(`http://${IP}:3000/api/student/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      const tickets = response.data || [];
      const profileTickets = tickets.filter(ticket => ticket.type === 'profile_update');
      const pendingTicket = profileTickets.find(ticket => ticket.status === 'pending');
      const approvedTicket = profileTickets.find(ticket => ticket.status === 'approved');
      
      if (pendingTicket) {
        setTicketStatus('pending');
        setApprovedTicketId(null);
      } else if (approvedTicket) {
        setTicketStatus('approved');
        setApprovedTicketId(approvedTicket.id);
      } else {
        setTicketStatus(null);
        setApprovedTicketId(null);
      }
    } catch (error) { 
      console.error('Error fetching tickets:', error);
      setTicketStatus(null);
      setApprovedTicketId(null);
      if (error.response && error.response.status !== 401 && error.response.status !== 404) {
        console.log('Ticket status fetch error:', error.response.data?.error || 'Unknown error');
      }
    }
  };

  const handleRaiseTicket = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const requestData = {
        subject: 'Profile Update Request',
        description: 'Request to update student profile information',
        type: 'profile_update',
        requested_updates: JSON.stringify({})
      };
      const response = await axios.post(
        `http://${IP}:3000/api/student/profile-update-ticket`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (response.data) {
        Alert.alert(
          'Success',
          'Profile update ticket raised successfully. Please wait for admin approval.',
          [
            {
              text: 'OK',
              onPress: () => {
                fetchProfileUpdateTickets();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error raising ticket:', error);
      Alert.alert(
        'Error',
        `Failed to raise ticket: ${error.response?.data?.error || error.message || 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = () => {
    if (approvedTicketId) {
      navigation.navigate('EditProfile', {
        ticketId: approvedTicketId,
        updates: {}
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                resizeMode="cover"
              />
              <View style={styles.editIconContainer}>
                <MaterialIcons name="edit" size= {20} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.title}>Profile Information</Text>
          <Text style={styles.profileText}>Name: {profile?.name}</Text>
          <Text style={styles.profileText}>Email: {profile?.email}</Text>
          <Text style={styles.profileText}>Branch: {profile?.branch}</Text>
          {ticketStatus === 'pending' ? (
            <View style={styles.statusCard}>
              <Text style={styles.pendingText}>Ticket Raised: Waiting for admin approval</Text>
            </View>
          ) : ticketStatus === 'approved' ? (
            <View style={styles.approvedCard}>
              <Text style={styles.approvedText}>You can update your profile</Text>
              <TouchableOpacity
                style={styles.updateButton}
                onPress={handleUpdateProfile}
              >
                <Text style={styles.buttonText}>Update Profile</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.raiseButton}
              onPress={handleRaiseTicket}
            >
              <Text style={styles.buttonText}>Raise Profile Update Ticket</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await AsyncStorage.removeItem('token');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }}
        >
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

// Main StudentDashboard Component
const StudentDashboard = () => {
  return (
    <ErrorBoundary>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Tickets') {
            iconName = 'confirmation-number';
          } else if (route.name === 'Attendance') {
            iconName = 'calendar-today';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 80 : 70,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 5,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        options={{ headerShown: false }}
      >
        {(props) => <HomeScreen {...props} />}
      </Tab.Screen>
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen name="Attendance" component={AttendanceScreen} />
      <Tab.Screen name="Chat" component={WhatsAppChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  homeContainer: {
    flexGrow: 1,
    backgroundColor: '#F3F4F6',
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: 12,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    alignItems: 'center',
    padding: 16,
  },
  greetingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  studentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  universityText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '400',
  },
  dateTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  dateTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateTimeText: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '500',
  },
  infoCard: {
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  infoCardContent: {
    padding: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  infoItem: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  resumeButtonContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  resumeButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resumeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  quickAccessContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quickAccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAccessCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  quickAccessGradient: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAccessText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  tasksContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  tasksHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  tasksHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tasksHeaderSubtitle: {
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
    fontWeight: '400',
  },
  tasksList: {
    flex: 1,
    marginTop: -10,
  },
  tasksListContent: {
    padding: 16,
    paddingBottom: 80,
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  taskCardGradient: {
    borderRadius: 16,
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskStatusBadge: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  taskDetails: {
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskDetailText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTasksIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTasksText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyTasksSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  closeButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginVertical: 8,
  },
  attendanceContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
    justifyContent: 'space-between',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  attendanceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  percentageContainer: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  attendanceCardHeader: {
    marginBottom: 8,
  },
  attendanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  attendanceCardBody: {
    gap: 6,
  },
  attendanceDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  attendanceModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  attendanceModalView: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  modalTitleAttendance: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalTextAttendance: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginVertical: 8,
  },
  closeButtonAttendance: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    alignSelf: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 4,
  },
  profileText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#1F2937',
  },
  raiseButton: {
    backgroundColor: '#10B981',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  updateButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  statusCard: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  pendingText: {
    color: '#B45309',
    fontSize: 14,
    textAlign: 'center',
  },
  approvedCard: {
    backgroundColor: '#DCFCE7',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  approvedText: {
    color: '#15803D',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  attendanceEmptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default StudentDashboard;