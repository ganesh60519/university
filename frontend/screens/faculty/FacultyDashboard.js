import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, ScrollView, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import axios from 'axios';
import { IP } from '../../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import WhatsAppFacultyChatScreen from './WhatsAppFacultyChatScreen';
import ErrorDialog from '../../components/ErrorDialog';
import LoadingOverlay from '../../components/LoadingOverlay';
import { LinearGradient } from 'expo-linear-gradient';


const Tab = createBottomTabNavigator();

// Main Faculty Home Screen Component
const FacultyHomeScreen = (props) => {
  const navigation = useNavigation();
  const [tasks, setTasks] = useState([]);
  const [students, setStudents] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newTask, setNewTask] = useTaskState();
  const [newAttendance, setNewAttendance] = useAttendanceState();
  const [subjects, setSubjects] = useState([
    { id: '1', name: 'Telugu' },
    { id: '2', name: 'Hindi' },
    { id: '3', name: 'English' },
    { id: '4', name: 'Maths' },
    { id: '5', name: 'Science' },
    { id: '6', name: 'Social' },
  ]);
  const [semesters, setSemesters] = useState(['1', '2', '3', '4', '5', '6', '7', '8']);
  const [facultyName, setFacultyName] = useState('');
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  // Error handling helper
  const handleError = (error, customMessage = null) => {
    console.error('Error occurred:', error);
    setError({
      ...error,
      customMessage
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

  // Custom hooks for state management
  function useTaskState() {
    return useState({
      title: '',
      description: '',
      student_id: '',
      due_date: new Date().toISOString().split('T')[0],
    });
  }

  function useAttendanceState() {
    return useState({
      student_id: '',
      semester: '',
      subject: '',
      status: 'present',
      date: new Date().toISOString().split('T')[0],
    });
  }

  useEffect(() => {
    fetchTasks();
    fetchStudents();
    fetchFacultyName();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://${IP}:3000/api/faculty/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data);
    } catch (error) {
      handleError(error, 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchTasks();
    } catch (error) {
      handleError(error, 'Failed to refresh tasks');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(`http://${IP}:3000/api/faculty/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStudents(response.data);
    } catch (error) {
      handleError(error, 'Failed to load students list');
    }
  };

  const fetchFacultyName = async () => {
    try {
      console.log('🔍 Fetching faculty name for home screen...');
      const token = await AsyncStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`http://${IP}:3000/api/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Faculty name response:', response.data);
      setFacultyName(response.data.name || 'Unknown Faculty');
    } catch (error) {
      console.error('❌ Error fetching faculty name:', error);
      console.error('Error details:', error.response?.data || error.message);
      setFacultyName('Unknown Faculty');
      // Don't show error dialog for faculty name fetch as it's not critical
    }
  };

  const assignTask = async () => {
    // Validation
    if (!newTask.title.trim()) {
      handleError({ message: 'Please enter a task title' }, 'Validation Error');
      return;
    }
    if (!newTask.description.trim()) {
      handleError({ message: 'Please enter a task description' }, 'Validation Error');
      return;
    }
    if (!newTask.student_id) {
      handleError({ message: 'Please select a student to assign the task' }, 'Validation Error');
      return;
    }
    if (!newTask.due_date) {
      handleError({ message: 'Please enter a due date' }, 'Validation Error');
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `http://${IP}:3000/api/faculty/assign-task`,
        {
          title: newTask.title.trim(),
          description: newTask.description.trim(),
          student_id: parseInt(newTask.student_id),
          due_date: newTask.due_date
        },
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        // Success - show success message
        handleSuccess('Task assigned successfully!');
        
        setModalVisible(false);
        setNewTask({
          title: '',
          description: '',
          student_id: '',
          due_date: new Date().toISOString().split('T')[0],
        });
        fetchTasks();
      }
    } catch (error) {
      handleError(error, 'Failed to assign task');
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = async () => {
    // Validation
    if (!newAttendance.student_id) {
      handleError({ message: 'Please select a student' }, 'Validation Error');
      return;
    }
    if (!newAttendance.semester) {
      handleError({ message: 'Please select a semester' }, 'Validation Error');
      return;
    }
    if (!newAttendance.subject) {
      handleError({ message: 'Please select a subject' }, 'Validation Error');
      return;
    }
    if (!newAttendance.status) {
      handleError({ message: 'Please select attendance status' }, 'Validation Error');
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `http://${IP}:3000/api/faculty/mark-attendance`,
        {
          student_id: parseInt(newAttendance.student_id),
          semester: newAttendance.semester,
          subject: newAttendance.subject,
          status: newAttendance.status,
          date: newAttendance.date,
          faculty_name: facultyName,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data) {
        // Success - show success message
        handleSuccess('Attendance marked successfully!');
        
        setAttendanceModalVisible(false);
        setNewAttendance({
          student_id: '',
          semester: '',
          subject: '',
          status: 'present',
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (error) {
      handleError(error, 'Failed to mark attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'submitted': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'submitted': return 'schedule';
      case 'in_progress': return 'hourglass-empty';
      case 'rejected': return 'cancel';
      default: return 'radio-button-unchecked';
    }
  };

  const renderTask = ({ item }) => (
    <TouchableOpacity 
      style={styles.taskCard}
      onPress={() => {
        setSelectedTask(item);
        setTaskModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.taskTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <MaterialIcons 
              name={getStatusIcon(item.status)} 
              size={16} 
              color={getStatusColor(item.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status || 'pending'}
            </Text>
          </View>
        </View>
      </View>
      
      <Text style={styles.taskDescription} numberOfLines={2}>{item.description}</Text>
      
      <View style={styles.taskFooter}>
        <View style={styles.taskInfo}>
          <View style={styles.infoItem}>
            <MaterialIcons name="person" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{item.student_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <MaterialIcons name="schedule" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{new Date(item.due_date).toLocaleDateString()}</Text>
          </View>
        </View>
        
        {item.status === 'submitted' && (
          <View style={styles.submissionIndicator}>
            <MaterialIcons name="assignment-turned-in" size={16} color="#f59e0b" />
            <Text style={styles.submissionText}>Review Required</Text>
          </View>
        )}
        
        {item.submitted_at && (
          <View style={styles.submittedInfo}>
            <MaterialIcons name="access-time" size={14} color="#10b981" />
            <Text style={styles.submittedText}>
              Submitted {new Date(item.submitted_at).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const updateTaskStatus = async (taskId, status, feedback = '') => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.put(
        `http://${IP}:3000/api/faculty/tasks/${taskId}/status`,
        { status, feedback },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        handleSuccess(`Task marked as ${status}!`);
        setTaskModalVisible(false);
        fetchTasks(); // Refresh tasks
      }
    } catch (error) {
      handleError(error, 'Failed to update task status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.replace('Login');
    } catch (error) {
      handleError(error, 'Failed to logout');
    }
  };

  const getCurrentGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <View style={styles.container}>
      {/* Header Section with Gradient */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>{getCurrentGreeting()}</Text>
            <Text style={styles.facultyName}>{facultyName || 'Faculty'}</Text>
            <Text style={styles.universityText}>Mahatma Gandhi University</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              disabled={refreshing}
            >
              <MaterialIcons 
                name="refresh" 
                size={24} 
                color="#ffffff" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <MaterialIcons name="logout" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Stats Section */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.statGradient}>
            <MaterialIcons name="assignment" size={28} color="#ffffff" />
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={['#43e97b', '#38f9d7']} style={styles.statGradient}>
            <MaterialIcons name="check-circle" size={28} color="#ffffff" />
            <Text style={styles.statNumber}>{tasks.filter(t => t.status === 'completed').length}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient colors={['#fa709a', '#fee140']} style={styles.statGradient}>
            <MaterialIcons name="pending" size={28} color="#ffffff" />
            <Text style={styles.statNumber}>{tasks.filter(t => t.status === 'submitted').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </LinearGradient>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.actionButtonGradient}
          >
            <MaterialIcons name="add-task" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Assign Task</Text>
          </LinearGradient>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setAttendanceModalVisible(true)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#f093fb', '#f5576c']}
            style={styles.actionButtonGradient}
          >
            <MaterialIcons name="how-to-reg" size={24} color="#ffffff" />
            <Text style={styles.actionButtonText}>Mark Attendance</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tasks Section */}
      <View style={styles.tasksSection}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="assignment" size={24} color="#667eea" />
          <Text style={styles.sectionTitle}>Recent Tasks</Text>
        </View>
        
        {isLoading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : (
          <FlatList
            data={tasks}
            renderItem={renderTask}
            keyExtractor={(item) => item.id.toString()}
            style={styles.tasksList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="assignment" size={64} color="#e5e7eb" />
                <Text style={styles.emptyText}>No tasks available</Text>
                <Text style={styles.emptySubText}>Create your first task to get started</Text>
              </View>
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#667eea']}
                tintColor="#667eea"
              />
            }
          />
        )}
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>Assign New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task Title"
              placeholderTextColor="#6b7280"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Task Description"
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={4}
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Due Date (YYYY-MM-DD)"
              placeholderTextColor="#6b7280"
              value={newTask.due_date}
              onChangeText={(text) => setNewTask({ ...newTask, due_date: text })}
            />
            <Picker
              selectedValue={newTask.student_id}
              onValueChange={(itemValue) =>
                setNewTask({ ...newTask, student_id: itemValue })
              }
              style={styles.picker}
            >
              <Picker.Item label="Select Student" value="" />
              {students.map((student) => (
                <Picker.Item
                  key={student.id}
                  label={student.name}
                  value={student.id}
                />
              ))}
            </Picker>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={assignTask}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Assign Task</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={attendanceModalVisible}
        onRequestClose={() => setAttendanceModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.attendanceModalView}>
            <Text style={styles.modalTitle}>Mark Attendance</Text>
            <Picker
              selectedValue={newAttendance.student_id}
              onValueChange={(itemValue) =>
                setNewAttendance({ ...newAttendance, student_id: itemValue })
              }
              style={styles.largePicker}
            >
              <Picker.Item label="Select Student" value="" />
              {students.map((student) => (
                <Picker.Item
                  key={student.id}
                  label={student.name}
                  value={student.id}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={newAttendance.semester}
              onValueChange={(itemValue) =>
                setNewAttendance({ ...newAttendance, semester: itemValue })
              }
              style={styles.largePicker}
            >
              <Picker.Item label="Select Semester" value="" />
              {semesters.map((sem) => (
                <Picker.Item key={sem} label={`Semester ${sem}`} value={sem} />
              ))}
            </Picker>
            <Picker
              selectedValue={newAttendance.subject}
              onValueChange={(itemValue) =>
                setNewAttendance({ ...newAttendance, subject: itemValue })
              }
              style={styles.largePicker}
            >
              <Picker.Item label="Select Subject" value="" />
              {subjects.map((subject) => (
                <Picker.Item
                  key={subject.id}
                  label={subject.name}
                  value={subject.name}
                />
              ))}
            </Picker>
            <Picker
              selectedValue={newAttendance.status}
              onValueChange={(itemValue) =>
                setNewAttendance({ ...newAttendance, status: itemValue })
              }
              style={styles.largePicker}
            >
              <Picker.Item label="Select Status" value="" />
              <Picker.Item label="Present" value="present" />
              <Picker.Item label="Absent" value="absent" />
            </Picker>
            <Text style={styles.detailText}>Date: {newAttendance.date}</Text>
            <Text style={styles.detailText}>Faculty: {facultyName}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setAttendanceModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={markAttendance}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Mark Attendance</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={taskModalVisible}
        onRequestClose={() => setTaskModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            {selectedTask && (
              <>
                <Text style={styles.modalTitle}>Task Details</Text>
                <Text style={styles.modalText}>Title: {selectedTask.title}</Text>
                <Text style={styles.modalText}>Description: {selectedTask.description}</Text>
                <Text style={styles.modalText}>Assigned to: {selectedTask.student_name}</Text>
                <Text style={styles.modalText}>
                  Due Date: {new Date(selectedTask.due_date).toLocaleDateString()}
                </Text>
                <Text style={[styles.modalText, { 
                  color: selectedTask.status === 'completed' ? '#16a34a' : 
                         selectedTask.status === 'submitted' ? '#f59e0b' : 
                         selectedTask.status === 'in_progress' ? '#3b82f6' : 
                         selectedTask.status === 'rejected' ? '#dc2626' : '#6b7280'
                }]}>
                  Status: {selectedTask.status || 'pending'}
                </Text>

                {selectedTask.submission_text && (
                  <>
                    <Text style={[styles.modalText, { fontWeight: 'bold', marginTop: 15 }]}>
                      Student Submission:
                    </Text>
                    <Text style={[styles.modalText, { 
                      backgroundColor: '#f3f4f6', 
                      padding: 10, 
                      borderRadius: 8,
                      fontStyle: 'italic'
                    }]}>
                      {selectedTask.submission_text}
                    </Text>
                    {selectedTask.submitted_at && (
                      <Text style={styles.modalText}>
                        Submitted on: {new Date(selectedTask.submitted_at).toLocaleString()}
                      </Text>
                    )}
                  </>
                )}

                {selectedTask.feedback && (
                  <>
                    <Text style={[styles.modalText, { fontWeight: 'bold', marginTop: 15 }]}>
                      Your Feedback:
                    </Text>
                    <Text style={[styles.modalText, { 
                      backgroundColor: '#fef3c7', 
                      padding: 10, 
                      borderRadius: 8,
                      fontStyle: 'italic'
                    }]}>
                      {selectedTask.feedback}
                    </Text>
                  </>
                )}

                <View style={styles.modalButtons}>
                  {selectedTask.status === 'submitted' && (
                    <>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: '#10b981' }]}
                        onPress={() => updateTaskStatus(selectedTask.id, 'completed')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonText}>✓ Complete</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.modalButton, { backgroundColor: '#ef4444' }]}
                        onPress={() => updateTaskStatus(selectedTask.id, 'rejected')}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.buttonText}>✗ Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: '#6b7280' }]}
                    onPress={() => setTaskModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingSection: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 4,
  },
  facultyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  universityText: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    padding: 10,
    borderRadius: 25,
  },

  // Stats Section
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statGradient: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },

  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Tasks Section
  tasksSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  tasksList: {
    flex: 1,
  },

  // Task Card Styles
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  taskHeader: {
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  taskFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  taskInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  submissionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  submissionText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
  submittedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  submittedText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },

  // Loading and Empty States
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
  },
  modalView: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  attendanceModalView: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 50,
    borderColor: '#e5e7eb',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    fontWeight: '500',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  picker: {
    width: '100%',
    height: 50,
    borderColor: '#e5e7eb',
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
  },
  largePicker: {
    width: '100%',
    height: 56,
    borderColor: '#e5e7eb',
    borderWidth: 2,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  submitButton: {
    backgroundColor: '#667eea',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 24,
  },
  loader: {
    marginVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 20,
  },
  // Profile Screen Styles
  profileScrollView: {
    flex: 1,
  },
  profileHeaderGradient: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  profileHeaderContent: {
    alignItems: 'center',
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileHeaderName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  profileHeaderRole: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
    textAlign: 'center',
  },
  profileInfoContainer: {
    padding: 20,
  },
  profileSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  profileInfoCards: {
    gap: 16,
  },
  profileInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  profileInfoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfoContent: {
    flex: 1,
  },
  profileInfoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  profileInfoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  profileActionsContainer: {
    padding: 20,
    paddingTop: 40,
  },
  profileLogoutButton: {
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileLogoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
  },
  profileLogoutText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Additional styles for date text in attendance modal
  detailText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    fontWeight: '500',
  },
});

// Main Faculty Dashboard Component with Tabs
const FacultyDashboard = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Attendance') {
            iconName = 'calendar-today';
          } else if (route.name === 'Chat') {
            iconName = 'chat';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          paddingBottom: 10,
          paddingTop: 10,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          height: 70,
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
        {(props) => <FacultyHomeScreen {...props} />}
      </Tab.Screen>

      <Tab.Screen 
        name="Chat" 
        component={WhatsAppFacultyChatScreen}
        options={{ headerShown: false }}
      />

      <Tab.Screen 
        name="Profile" 
        component={FacultyProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
};

// Faculty Profile Screen Component
const FacultyProfileScreen = () => {
  const navigation = useNavigation();
  const [facultyProfile, setFacultyProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  // Error handling helper
  const handleError = (error, customMessage = null) => {
    console.error('Profile Error occurred:', error);
    setError({
      ...error,
      customMessage
    });
    setErrorDialogVisible(true);
  };

  const closeErrorDialog = () => {
    setErrorDialogVisible(false);
    setError(null);
  };

  useEffect(() => {
    fetchFacultyProfile();
  }, []);

  const fetchFacultyProfile = async () => {
    try {
      console.log('🔍 Fetching faculty profile...');
      const token = await AsyncStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(`http://${IP}:3000/api/faculty/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('✅ Faculty profile response:', response.data);
      setFacultyProfile(response.data);
    } catch (error) {
      console.error('❌ Error fetching faculty profile:', error);
      console.error('Error details:', error.response?.data || error.message);
      handleError(error, 'Failed to load profile information');
      setFacultyProfile({ name: 'Unknown Faculty', email: '', branch: '' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('token');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      handleError(error, 'Failed to logout');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.profileScrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.profileHeaderGradient}
        >
          <View style={styles.profileHeaderContent}>
            <View style={styles.profileAvatar}>
              <MaterialIcons name="person" size={60} color="#ffffff" />
            </View>
            <Text style={styles.profileHeaderName}>{facultyProfile?.name || 'Faculty'}</Text>
            <Text style={styles.profileHeaderRole}>Faculty Member</Text>
          </View>
        </LinearGradient>

        {/* Profile Information */}
        <View style={styles.profileInfoContainer}>
          <Text style={styles.profileSectionTitle}>Personal Information</Text>
          
          {facultyProfile && (
            <View style={styles.profileInfoCards}>
              <View style={styles.profileInfoCard}>
                <View style={styles.profileInfoIcon}>
                  <MaterialIcons name="person" size={24} color="#667eea" />
                </View>
                <View style={styles.profileInfoContent}>
                  <Text style={styles.profileInfoLabel}>Full Name</Text>
                  <Text style={styles.profileInfoValue}>{facultyProfile.name || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.profileInfoCard}>
                <View style={styles.profileInfoIcon}>
                  <MaterialIcons name="email" size={24} color="#667eea" />
                </View>
                <View style={styles.profileInfoContent}>
                  <Text style={styles.profileInfoLabel}>Email Address</Text>
                  <Text style={styles.profileInfoValue}>{facultyProfile.email || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.profileInfoCard}>
                <View style={styles.profileInfoIcon}>
                  <MaterialIcons name="business" size={24} color="#667eea" />
                </View>
                <View style={styles.profileInfoContent}>
                  <Text style={styles.profileInfoLabel}>Department</Text>
                  <Text style={styles.profileInfoValue}>{facultyProfile.branch || 'N/A'}</Text>
                </View>
              </View>
              
              <View style={styles.profileInfoCard}>
                <View style={styles.profileInfoIcon}>
                  <MaterialIcons name="badge" size={24} color="#667eea" />
                </View>
                <View style={styles.profileInfoContent}>
                  <Text style={styles.profileInfoLabel}>Faculty ID</Text>
                  <Text style={styles.profileInfoValue}>{facultyProfile.id || 'N/A'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Logout Button */}
        <View style={styles.profileActionsContainer}>
          <TouchableOpacity
            style={styles.profileLogoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#ef4444', '#dc2626']}
              style={styles.profileLogoutGradient}
            >
              <MaterialIcons name="logout" size={24} color="#ffffff" />
              <Text style={styles.profileLogoutText}>Logout</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ErrorDialog
        visible={errorDialogVisible}
        onClose={closeErrorDialog}
        error={error}
        title={error?.customMessage || "Error"}
      />
    </View>
  );
};

export default FacultyDashboard;