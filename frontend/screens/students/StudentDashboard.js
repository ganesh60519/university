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
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const cardAnimations = useRef([...Array(4)].map(() => new Animated.Value(1))).current;


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
         // console.log('Profile data received:', response.data);
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
          startAnimations();
        }
      }
    };

    fetchProfile();
    return () => { isMounted = false; };
  }, []);

  const startAnimations = () => {
    // Content is already visible, no need for complex animations
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    scaleAnim.setValue(1);
    cardAnimations.forEach(anim => anim.setValue(1));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Re-fetch profile data
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
          colors={['#667eea', '#764ba2']}
          style={styles.loadingGradient}
        >
          <View style={styles.loadingContent}>
            <View style={styles.loadingIconContainer}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
            <View style={styles.loadingDots}>
              <View style={[styles.dot, styles.dot1]} />
              <View style={[styles.dot, styles.dot2]} />
              <View style={[styles.dot, styles.dot3]} />
            </View>
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
      <StatusBar barStyle="light-content" backgroundColor="#4F46E5" />
      <ScrollView 
        contentContainerStyle={styles.homeContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Enhanced Header Section with Gradient */}
        <View>
          <LinearGradient
            colors={['#667eea', '#764ba2', '#f093fb']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.headerTopRow}>
                <View style={styles.headerCenter}>
                  <Text style={styles.greetingText}>{getCurrentGreeting()}</Text>
                  <Text style={styles.studentName}>{profile?.name || 'Student'}</Text>
                </View>
              </View>
              <Text style={styles.universityText}>Mahatma Gandhi University</Text>
              
              {/* Weather-like info card */}
              <View style={styles.weatherCard}>
                <View style={styles.weatherInfo}>
                  <Feather name="calendar" size={16} color="#FFFFFF" />
                  <Text style={styles.weatherText}>
                    {new Date().toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                </View>
                <View style={styles.weatherInfo}>
                  <Feather name="clock" size={16} color="#FFFFFF" />
                  <Text style={styles.weatherText}>
                    {new Date().toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced Student Information Card */}
        <View style={styles.infoCard}>
          <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.infoCardGradient}
          >
            <View style={styles.infoHeader}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="person" size={24} color="#667eea" />
              </View>
              <Text style={styles.infoTitle}>Student Information</Text>
            </View>
            
            <View style={styles.infoContent}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Feather name="user" size={18} color="#667eea" />
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Full Name</Text>
                  <Text style={styles.infoValue}>{profile?.name || '-'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Feather name="mail" size={18} color="#667eea" />
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Email Address</Text>
                  <Text style={styles.infoValue}>{profile?.email || '-'}</Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrapper}>
                  <Feather name="book" size={18} color="#667eea" />
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Branch</Text>
                  <Text style={styles.infoValue}>{profile?.branch || '-'}</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Enhanced Resume Button */}
        <View>
          <TouchableOpacity
            style={styles.resumeButton}
            onPress={() => navigation.navigate('Resume')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.resumeButtonGradient}
            >
              <View style={styles.resumeIconContainer}>
                <MaterialIcons name="description" size={26} color="#ffffff" />
              </View>
              <View style={styles.resumeTextContainer}>
                <Text style={styles.resumeButtonText}>Create Resume</Text>
                <Text style={styles.resumeButtonSubtext}>Build your professional profile</Text>
              </View>
              <Feather name="arrow-right" size={22} color="#ffffff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <LinearGradient colors={['#667eea', '#764ba2']} style={styles.statGradient}>
                <Feather name="trending-up" size={24} color="#FFFFFF" />
                <Text style={styles.statNumber}>92%</Text>
                <Text style={styles.statLabel}>Overall Score</Text>
              </LinearGradient>
            </View>
            
            <View style={styles.statCard}>
              <LinearGradient colors={['#f093fb', '#f5576c']} style={styles.statGradient}>
                <Feather name="award" size={24} color="#FFFFFF" />
                <Text style={styles.statNumber}>15</Text>
                <Text style={styles.statLabel}>Achievements</Text>
              </LinearGradient>
            </View>
          </View>
        </View>
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
        // Update local state
        setTasks(prevTasks =>
          prevTasks.map(task =>
            task.id === taskId ? { ...task, status: 'submitted', submission_text: submissionText } : task
          )
        );
        Alert.alert('Success', 'Task submitted successfully!');
        setSubmissionModalVisible(false);
        setSubmissionText('');
        setModalVisible(false);
        // Refresh the task list
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
      
      // Ensure response.data is an array and filter out invalid items
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
              <MaterialIcons name="assignment" size={24} color="#667eea" />
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
        colors={['#667eea', '#764ba2']}
        style={styles.tasksHeader}
      >
        <Text style={styles.tasksHeaderTitle}>My Tasks</Text>
        <Text style={styles.tasksHeaderSubtitle}>Stay organized and productive</Text>
      </LinearGradient>
      
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#667eea" />
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

      {/* Task Submission Modal */}
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
      
      // Ensure response.data is an array and filter out invalid items
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
          <ActivityIndicator size="large" color="#2563eb" />
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
      
      // Ensure response.data is an array and filter out invalid items
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
          <ActivityIndicator size="large" color="#2563eb" />
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
                  <Text style={styles.attendanceEmptyText}>ðŸ—“ï¸� No attendance records available</Text>
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
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.profileCard}>
          {/* Profile Image Section */}
          <View style={styles.profileImageContainer}>
            <TouchableOpacity onPress={pickImage}>
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
                resizeMode="cover"
              />
              <View style={styles.editIconContainer}>
                <MaterialIcons name="edit" size={20} color="#ffffff" />
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
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          paddingBottom: Platform.OS === 'ios' ? 25 : 12,
          paddingTop: 12,
          borderTopWidth: 0,
          elevation: 25,
          shadowColor: '#667eea',
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: 0.2,
          shadowRadius: 20,
          height: Platform.OS === 'ios' ? 90 : 75,
          borderTopLeftRadius: 25,
          borderTopRightRadius: 25,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: 'System',
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
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    alignItems: 'center',
  },
  homeContainer: {
    flexGrow: 1,
    backgroundColor: '#F8FAFC',
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    padding: 40,
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 20,
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  universityText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  weatherCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weatherText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  infoCard: {
    marginHorizontal: 20,
    marginTop: -25,
    marginBottom: 5,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  infoCardGradient: {
    borderRadius: 25,
    padding: 25,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginLeft: 12,
  },

  infoContent: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 15,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  infoIconWrapper: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  infoItem: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  attendanceContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  attendanceCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  attendanceCardHeader: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  attendanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  detailText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 22,
  },
  attendanceDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 6,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  attendanceModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  attendanceModalView: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTitleAttendance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalTextAttendance: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 10,
  },
  closeButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  closeButtonAttendance: {
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    width: '100%',
  },
  profileText: {
    fontSize: 16,
    marginBottom: 12,
    color: '#1E293B',
    lineHeight: 24,
  },
  raiseButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButton: {
    backgroundColor: '#4F46E5',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  statusCard: {
    backgroundColor: '#fef9c3',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  pendingText: {
    color: '#b45309',
    fontSize: 14,
    textAlign: 'center',
  },
  approvedCard: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  approvedText: {
    color: '#15803d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '500',
  },
  attendanceEmptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loaderText: {
    marginTop: 16,
    fontSize: 16,
    color: '#4F46E5',
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Legacy styles - keeping for backward compatibility but updated
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginVertical: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  tableLabel: {
    fontWeight: '600',
    color: '#64748B',
    fontSize: 16,
  },
  tableValue: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '600',
  },
  resumeButton: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 5,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  resumeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 22,
    paddingHorizontal: 25,
    minHeight: 80,
  },
  resumeIconContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  resumeTextContainer: {
    flex: 1,
    marginLeft: 18,
    justifyContent: 'center',
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 19,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  resumeButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },

  statsContainer: {
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 35,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 10,
  },
  statGradient: {
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 130,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 16,
  },
  emptySubText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  attendanceSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4F46E5',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    fontWeight: '500',
  },
  percentageContainer: {
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 12,
    color: '#1E293B',
  },
  progressBar: {
    width: '100%',
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  profileImageContainer: {
    width: 120,
    height: 170,
    borderRadius: 60,
    overflow: 'hidden',
    alignSelf: 'center',
    marginTop: 20,
    borderWidth: 4,
    borderColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 6,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    padding: 6,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  toggleButtonActive: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleButtonText: {
    fontSize: 15,
    color: '#64748B',
    fontWeight: '600',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
    marginVertical: 12,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  // Enhanced Task Styles
  tasksContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tasksHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  tasksHeaderTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 5,
  },
  tasksHeaderSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '500',
  },
  tasksList: {
    flex: 1,
    marginTop: -15,
  },
  tasksListContent: {
    padding: 20,
    paddingBottom: 100,
  },
  taskCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  taskCardGradient: {
    borderRadius: 20,
    padding: 20,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  taskIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskStatusBadge: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  statusBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    lineHeight: 24,
  },
  taskDetails: {
    gap: 8,
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskDetailText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyTasksContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTasksIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTasksText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTasksSubtext: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
  },

});

export default StudentDashboard;