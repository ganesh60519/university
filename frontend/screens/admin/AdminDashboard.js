import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, ActivityIndicator, Alert, SectionList, Image } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { IP } from '../../ip';
import { useNavigation } from '@react-navigation/native';

const Tab = createBottomTabNavigator();

// Enhanced Error Dialog Component
const EnhancedErrorDialog = ({ visible, error, onClose }) => {
  const getErrorMessage = (error) => {
    if (!error) return { title: 'Error', message: 'An unknown error occurred' };

    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network Error')) {
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again later.',
        icon: 'wifi-off'
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        title: 'Connection Timeout',
        message: 'The request took too long to complete. Please check your connection and try again.',
        icon: 'access-time'
      };
    }

    // Authentication errors
    if (error.response?.status === 401) {
      return {
        title: 'Authentication Error',
        message: 'Your session has expired. Please log in again to continue.',
        icon: 'lock'
      };
    }

    // Authorization errors
    if (error.response?.status === 403) {
      return {
        title: 'Access Denied',
        message: 'You do not have permission to perform this action.',
        icon: 'block'
      };
    }

    // Server errors
    if (error.response?.status >= 500) {
      return {
        title: 'Server Error',
        message: 'The server is currently experiencing issues. Please try again later.',
        icon: 'error'
      };
    }

    // Client errors
    if (error.response?.status >= 400) {
      return {
        title: 'Request Error',
        message: error.response?.data?.message || error.response?.data?.error || 'There was an issue with your request. Please check your input and try again.',
        icon: 'warning'
      };
    }

    // Custom error messages
    if (error.customMessage) {
      return {
        title: error.isSuccess ? 'Success' : 'Error',
        message: error.customMessage,
        icon: error.isSuccess ? 'check-circle' : 'error'
      };
    }

    // Default error
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
      icon: 'error'
    };
  };

  const errorInfo = getErrorMessage(error);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.errorModalOverlay}>
        <Animatable.View animation="zoomIn" style={styles.errorModalContainer}>
          <View style={[styles.errorIconContainer, { backgroundColor: error?.isSuccess ? '#10b981' : '#ef4444' }]}>
            <MaterialIcons 
              name={errorInfo.icon} 
              size={40} 
              color="#fff" 
            />
          </View>
          
          <Text style={styles.errorModalTitle}>{errorInfo.title}</Text>
          <Text style={styles.errorModalMessage}>{errorInfo.message}</Text>
          
          <TouchableOpacity
            style={[styles.errorModalButton, { backgroundColor: error?.isSuccess ? '#10b981' : '#ef4444' }]}
            onPress={onClose}
          >
            <Text style={styles.errorModalButtonText}>
              {error?.isSuccess ? 'Great!' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );
};

// Color options for section backgrounds
const COLOR_PALETTE = [
  '#e5e7eb', // Light Gray
  '#d1fae5', // Light Green
  '#dbeafe', // Light Blue
  '#fce7f3', // Light Pink
  '#fef3c7', // Light Yellow
  '#f9a825', // Warm Orange
];

// Home Screen Component
const HomeScreen = () => {
  const navigation = useNavigation();
  const [overview, setOverview] = useState({
    totalTasks: 0,
    totalStudents: 0,
    totalFaculty: 0,
    attendancePercentage: 0,
    totalUsers: 0,
    totalTickets: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(COLOR_PALETTE[0]);
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  // Enhanced error handling function
  const handleError = (error, customMessage = null) => {
    console.error('Admin Dashboard Error:', error);
    setError({
      ...error,
      customMessage,
      isSuccess: false
    });
    setErrorDialogVisible(true);
  };

  // Success message function
  const handleSuccess = (message) => {
    setError({
      customMessage: message,
      isSuccess: true
    });
    setErrorDialogVisible(true);
  };

  // Close error dialog
  const closeErrorDialog = () => {
    setErrorDialogVisible(false);
    setError(null);
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const [tasksResponse, usersResponse, attendanceResponse, ticketsResponse] = await Promise.all([
        axios.get(`http://${IP}:3000/api/admin/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(error => ({ data: [] })),
        axios.get(`http://${IP}:3000/api/admin/users`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(error => ({ data: { students: [], faculty: [] } })),
        axios.get(`http://${IP}:3000/api/admin/attendance`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(error => ({ data: [] })),
        axios.get(`http://${IP}:3000/api/admin/tickets`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(error => ({ data: [] })),
      ]);

      const totalTasks = tasksResponse.data.length || 0;
      const totalStudents = usersResponse.data.students?.length || 0;
      const totalFaculty = usersResponse.data.faculty?.length || 0;
      const attendanceRecords = attendanceResponse.data || [];
      const presentCount = attendanceRecords.filter(record => record.status === 'Present').length;
      const totalClasses = attendanceRecords.length;
      const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
      const totalUsers = (totalStudents + totalFaculty) || 0;
      const totalTickets = ticketsResponse.data.length || 0;

      setOverview({
        totalTasks,
        totalStudents,
        totalFaculty,
        attendancePercentage,
        totalUsers,
        totalTickets,
      });
    } catch (error) {
      handleError(error, 'Failed to load dashboard overview data');
    } finally {
      setIsLoading(false);
    }
  };

  const changeBackgroundColor = () => {
    const currentIndex = COLOR_PALETTE.indexOf(backgroundColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
    setBackgroundColor(COLOR_PALETTE[nextIndex]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor }]}>
      <Animatable.View animation="fadeInDown" duration={1000} style={styles.overviewContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dashboard Overview</Text>
          <TouchableOpacity onPress={changeBackgroundColor} style={styles.colorPickerButton}>
            <MaterialIcons name="color-lens" size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        <View style={styles.overviewGrid}>
          {[
            { name: 'Tasks', count: overview.totalTasks, icon: 'assignment', navigateTo: 'Tasks' },
            { name: 'Students', count: overview.totalStudents, icon: 'school', navigateTo: 'Users' },
            { name: 'Faculty', count: overview.totalFaculty, icon: 'people', navigateTo: 'Users' },
            { name: 'Attendance', count: `${overview.attendancePercentage}%`, icon: 'calendar-today', action: () => Alert.alert('Info', 'Attendance overview is shown here.') },
            { name: 'Users', count: overview.totalUsers, icon: 'group', navigateTo: 'Users' },
            { name: 'Tickets', count: overview.totalTickets, icon: 'confirmation-number', navigateTo: 'Tickets' },
          ].map((item, index) => (
            <Animatable.View
              key={item.name}
              animation="zoomIn"
              delay={index * 200}
              style={styles.overviewButton}
            >
              <TouchableOpacity
                style={styles.overviewButtonInner}
                onPress={() => item.navigateTo ? navigation.navigate(item.navigateTo) : item.action()}
              >
                <MaterialIcons name={item.icon} size={28} color="#ffffff" />
                <Text style={styles.overviewButtonText}>{`${item.name}: ${item.count}`}</Text>
              </TouchableOpacity>
            </Animatable.View>
          ))}
        </View>
      </Animatable.View>
      
      <EnhancedErrorDialog
        visible={errorDialogVisible}
        error={error}
        onClose={closeErrorDialog}
      />
    </ScrollView>
  );
};

// Users Screen Component
const UsersScreen = () => {
  const [users, setUsers] = useState({ students: [], faculty: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(COLOR_PALETTE[0]);
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  // Enhanced error handling function
  const handleError = (error, customMessage = null) => {
    console.error('Users Screen Error:', error);
    setError({
      ...error,
      customMessage,
      isSuccess: false
    });
    setErrorDialogVisible(true);
  };

  // Success message function
  const handleSuccess = (message) => {
    setError({
      customMessage: message,
      isSuccess: true
    });
    setErrorDialogVisible(true);
  };

  // Close error dialog
  const closeErrorDialog = () => {
    setErrorDialogVisible(false);
    setError(null);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`http://${IP}:3000/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }).catch(error => ({ data: { students: [], faculty: [] } }));

      const { students = [], faculty = [] } = response.data || {};
     // console.log('Users fetched:', { students, faculty });
      setUsers({ students, faculty });
      if (faculty.length === 0) {
        console.warn('No faculty data received');
      }
    } catch (error) {
      handleError(error, 'Failed to load users data');
    } finally {
      setIsLoading(false);
    }
  };

  const changeBackgroundColor = () => {
    const currentIndex = COLOR_PALETTE.indexOf(backgroundColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
    setBackgroundColor(COLOR_PALETTE[nextIndex]);
  };

  const renderUser = ({ item, section }) => (
    <Animatable.View animation="fadeInUp" delay={100} style={styles.card}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.detailText}>Email: {item.email}</Text>
      <Text style={styles.detailText}>Branch: {item.branch}</Text>
      {section.title === 'Students' && (
        <Text style={styles.detailText}>
          Profile Edit: {item.profile_edit ? 'Pending' : 'None'}
        </Text>
      )}
    </Animatable.View>
  );

  const sections = [
    { title: 'Students', data: users.students },
    { title: 'Faculty', data: users.faculty },
  ];

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Users</Text>
        <TouchableOpacity onPress={changeBackgroundColor} style={styles.colorPickerButton}>
          <MaterialIcons name="color-lens" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderUser}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionTitle}>{title}</Text>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No users available</Text>}
        />
      )}
      
      <EnhancedErrorDialog
        visible={errorDialogVisible}
        error={error}
        onClose={closeErrorDialog}
      />
    </View>
  );
};

// Tasks Screen Component
const TasksScreen = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(COLOR_PALETTE[0]);
  const [error, setError] = useState(null);
  const [errorDialogVisible, setErrorDialogVisible] = useState(false);

  // Enhanced error handling function
  const handleError = (error, customMessage = null) => {
    console.error('Tasks Screen Error:', error);
    setError({
      ...error,
      customMessage,
      isSuccess: false
    });
    setErrorDialogVisible(true);
  };

  // Success message function
  const handleSuccess = (message) => {
    setError({
      customMessage: message,
      isSuccess: true
    });
    setErrorDialogVisible(true);
  };

  // Close error dialog
  const closeErrorDialog = () => {
    setErrorDialogVisible(false);
    setError(null);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`http://${IP}:3000/api/admin/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }).catch(error => ({ data: [] }));

      setTasks(response.data || []);
    } catch (error) {
      handleError(error, 'Failed to load tasks data');
    } finally {
      setIsLoading(false);
    }
  };

  const changeBackgroundColor = () => {
    const currentIndex = COLOR_PALETTE.indexOf(backgroundColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
    setBackgroundColor(COLOR_PALETTE[nextIndex]);
  };

  const renderTask = ({ item }) => (
    <Animatable.View animation="fadeInUp" delay={100} style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedTask(item);
          setModalVisible(true);
        }}
      >
        <Text style={[styles.title, { padding: 8, textAlign: 'center' }]}>{item.title}</Text>
        <Text style={styles.detailText}>Due: {new Date(item.due_date).toLocaleDateString()}</Text>
        <Text style={[styles.detailText, { color: item.status === 'completed' ? '#22c55e' : '#ef4444' }]}>
          Status: {item.status}
        </Text>
        <Text style={styles.detailText}>Assigned To: {item.assigned_to} ({item.role})</Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tasks</Text>
        <TouchableOpacity onPress={changeBackgroundColor} style={styles.colorPickerButton}>
          <MaterialIcons name="color-lens" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No tasks available</Text>}
        />
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" style={styles.modalView}>
            {selectedTask && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTask.title}</Text>
                <Text style={styles.modalText}>Description: {selectedTask.description}</Text>
                <Text style={styles.modalText}>Due Date: {new Date(selectedTask.due_date).toLocaleDateString()}</Text>
                <Text style={styles.modalText}>Status: {selectedTask.status}</Text>
                <Text style={styles.modalText}>Assigned To: {selectedTask.assigned_to} ({selectedTask.role})</Text>
                <Text style={styles.modalText}>Assigned By: {selectedTask.assigned_by}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

// Tickets Screen Component
const TicketsScreen = () => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`http://${IP}:3000/api/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }).catch(error => ({ data: [] }));

      setTickets(response.data || []);
    } catch (error) {
      console.error('Unexpected error fetching tickets:', error);
      Alert.alert('Error', 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTicketAction = async (ticketId, action) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      await axios.put(
        `http://${IP}:3000/api/admin/profile-update-tickets/${ticketId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
      ).catch(error => {
        console.error(`Ticket ${action} error:`, error.response?.data || error.message);
        throw new Error(`Failed to ${action} ticket`);
      });

      Alert.alert('Success', `Ticket ${action}d successfully`);
      setModalVisible(false);
      fetchTickets();
    } catch (error) {
      console.error('Unexpected error handling ticket:', error);
      Alert.alert('Error', error.message || 'Failed to process ticket');
    }
  };

  const changeBackgroundColor = () => {
    const currentIndex = COLOR_PALETTE.indexOf(backgroundColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
    setBackgroundColor(COLOR_PALETTE[nextIndex]);
  };

  const renderTicket = ({ item }) => (
    <Animatable.View animation="fadeInUp" delay={100} style={styles.card}>
      <TouchableOpacity
        onPress={() => {
          setSelectedTicket(item);
          setModalVisible(true);
        }}
      >
        <Text style={styles.title}>{item.subject}</Text>
        <Text style={styles.detailText}>Raised By: {item.raised_by_name} ({item.role})</Text>
        <Text style={[styles.detailText, { color: item.status === 'closed' || item.status === 'completed' ? '#22c55e' : item.status === 'pending' ? '#f59e0b' : '#ef4444' }]}>
          Status: {item.status}
        </Text>
        <Text style={styles.detailText}>Type: {item.type || 'General'}</Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tickets</Text>
        <TouchableOpacity onPress={changeBackgroundColor} style={styles.colorPickerButton}>
          <MaterialIcons name="color-lens" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicket}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={<Text style={styles.emptyText}>No tickets available</Text>}
        />
      )}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setOverview(false)}
      >
        <View style={styles.modalContainer}>
          <Animatable.View animation="zoomIn" style={styles.modalView}>
            {selectedTicket && (
              <ScrollView>
                <Text style={styles.modalTitle}>{selectedTicket.subject}</Text>
                <Text style={styles.modalText}>Description: {selectedTicket.description}</Text>
                <Text style={styles.modalText}>Raised By: {selectedTicket.raised_by_name} ({selectedTicket.role})</Text>
                <Text style={styles.modalText}>Status: {selectedTicket.status}</Text>
                <Text style={styles.modalText}>Created At: {new Date(selectedTicket.created_at).toLocaleString()}</Text>
                {selectedTicket.type === 'profile_update' && selectedTicket.requested_updates && (
                  <>
                    <Text style={styles.modalText}> Requested Updates:</Text>
                    {(() => {
                      try {
                        const updates = JSON.parse(selectedTicket.requested_updates);
                        return Object.entries(updates).map(([key, value]) => (
                          <Text key={key} style={styles.modalText}>  {key}: {value}</Text>
                        ));
                      } catch (e) {
                        return <Text style={styles.modalText}>Invalid update data</Text>;
                      }
                    })()}
                  </>
                )}
                {selectedTicket.response && (
                  <Text style={styles.modalText}>Response: {selectedTicket.response}</Text>
                )}
                {selectedTicket.type === 'profile_update' && selectedTicket.status === 'pending' && (
                  <View style={styles.buttonContainer}>
                    <TouchableOpacity
                      style={[styles.button, styles.submitButton]}
                      onPress={() => handleTicketAction(selectedTicket.id, 'approve')}
                    >
                      <Text style={styles.buttonText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => handleTicketAction(selectedTicket.id, 'reject')}
                    >
                      <Text style={styles.buttonText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};



// Profile Screen Component
const ProfileScreen = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(COLOR_PALETTE[0]);

  useEffect(() => {
    fetchProfile();
  }, []);



  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('No authentication token found');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      const response = await axios.get(`http://${IP}:3000/api/admin/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      const profileData = response.data || { name: 'N/A', email: 'N/A' };
      console.log('Profile fetched:', profileData);
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching profile:', error);
      let errorMessage = 'Failed to fetch profile';
      if (error.response) {
        switch (error.response.status) {
          case 404:
            errorMessage = 'Admin profile not found';
            break;
          case 401:
            errorMessage = 'Unauthorized. Please login again';
            break;
          case 403:
            errorMessage = 'Access denied';
            break;
          default:
            errorMessage = error.response.data?.error || errorMessage;
        }
      }
      Alert.alert('Error', errorMessage);
      setProfile({ name: 'N/A', email: 'N/A' });
    } finally {
      setIsLoading(false);
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
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  const changeBackgroundColor = () => {
    const currentIndex = COLOR_PALETTE.indexOf(backgroundColor);
    const nextIndex = (currentIndex + 1) % COLOR_PALETTE.length;
    setBackgroundColor(COLOR_PALETTE[nextIndex]);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Admin Profile</Text>
        <TouchableOpacity onPress={changeBackgroundColor} style={styles.colorPickerButton}>
          <MaterialIcons name="color-lens" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      
      <Animatable.View animation="fadeInUp" style={styles.profileCard}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.adminIconContainer}>
            <MaterialIcons name="admin-panel-settings" size={60} color="#3b82f6" />
          </View>
          <Text style={styles.adminTitle}>Administrator</Text>
        </View>

        {/* Profile Information */}
        <View style={styles.profileInfoContainer}>
          <View style={styles.infoRow}>
            <MaterialIcons name="person" size={24} color="#3b82f6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Full Name</Text>
              <Text style={styles.infoValue}>{profile?.name || 'Loading...'}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialIcons name="email" size={24} color="#3b82f6" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{profile?.email || 'Loading...'}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialIcons name="logout" size={20} color="#ffffff" />
            <Text style={styles.actionButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </Animatable.View>
    </ScrollView>
  );
};

// Main AdminDashboard Component
const AdminDashboard = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = 'home';
          } else if (route.name === 'Users') {
            iconName = 'people';
          } else if (route.name === 'Tasks') {
            iconName = 'assignment';
          } else if (route.name === 'Tickets') {
            iconName = 'confirmation-number';
          } else if (route.name === 'Profile') {
            iconName = 'person';
          }
          return (
            <Animatable.View animation={focused ? 'pulse' : undefined}>
              <MaterialIcons name={iconName} size={size} color={color} />
            </Animatable.View>
          );
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#1f2937',
          paddingBottom: 8,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#3b82f6',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Users" component={UsersScreen} />
      <Tab.Screen name="Tasks" component={TasksScreen} />
      <Tab.Screen name="Tickets" component={TicketsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: '#e5e7eb',
  },
  list: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 6,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  submitButton: {
    backgroundColor: '#22c55e',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  adminIconContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  adminTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileInfoContainer: {
    marginBottom: 32,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
  },
  infoTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  actionButtonsContainer: {
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  profileText: {
    fontSize: 18,
    marginBottom: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6b7280',
    marginTop: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 16,
    elevation: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  overviewButton: {
    width: '48%',
    marginBottom: 12,
  },
  overviewButtonInner: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },

  colorPickerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  // Error Modal Styles
  errorModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  errorModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default AdminDashboard;