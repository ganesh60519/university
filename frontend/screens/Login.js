import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { IP } from '../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState(null); // For login error container

  // Helper function to show error container
  const showErrorContainer = (title, message) => {
    setLoginError({ title, message });
    // Auto-dismiss after 5 seconds
    setTimeout(() => setLoginError(null), 5000);
  };

  // Enhanced error handler for all network/API errors
  const handleApiError = (error) => {
    // Handle different types of errors
    if (!error.response) {
      // Network error - no response from server
      return {
        title: 'Network Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.'
      };
    }
    
    const status = error.response.status;
    
    if (status === 404) {
      return {
        title: 'Network Error',
        message: 'Service temporarily unavailable. Please check your internet connection and try again.'
      };
    } else if (status === 500) {
      return {
        title: 'Network Error',
        message: 'Server error. Please check your internet connection and try again.'
      };
    } else if (status >= 400 && status < 500) {
      return {
        title: 'Network Error',
        message: 'Please check your internet connection and try again.'
      };
    } else {
      return {
        title: 'Network Error',
        message: 'Service temporarily unavailable. Please check your internet connection and try again.'
      };
    }
  };

  const handleLogin = async () => {
    try {
      setLoading(true);
      if (!email || !password) {
        showErrorContainer('Error', 'Please fill in all fields');
        setLoading(false);
        return;
      }

      const response = await axios.post(`http://${IP}:3000/api/auth/login`, {
        email,
        password,
      });

      if (response.data.token && response.data.user) {
        await AsyncStorage.setItem('token', response.data.token);
        await AsyncStorage.setItem('userRole', response.data.user.role);

        const role = response.data.user.role;
        navigation.replace(
          role === 'student'
            ? 'StudentDashboard'
            : role === 'faculty'
            ? 'FacultyDashboard'
            : 'AdminDashboard'
        );
      } else {
        showErrorContainer('Error', 'Invalid email or password');
      }
    } catch (error) {
      // Use the enhanced error handler
      let errorInfo;
      
      if (error.response?.status === 401) {
        // Show dialog box for invalid credentials
        Alert.alert(
          'Invalid Credentials',
          'Invalid email or password. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => {},
              style: 'cancel',
            },
          ],
          { cancelable: true }
        );
      } else if (error.response?.status === 400) {
        errorInfo = {
          title: 'Login Failed',
          message: 'Please check your email and password.'
        };
        showErrorContainer(errorInfo.title, errorInfo.message);
      } else {
        errorInfo = handleApiError(error);
        showErrorContainer(errorInfo.title, errorInfo.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

            {/* Login Error Container */}
            {loginError && (
              <View style={styles.errorContainer}>
                <MaterialIcons name="error-outline" size={20} color="#ef4444" />
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorTitle}>{loginError.title}</Text>
                  <Text style={styles.errorMessage}>{loginError.message}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.dismissButton}
                  onPress={() => setLoginError(null)}
                >
                  <MaterialIcons name="close" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>User Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  editable={!loading}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  disabled={loading}
                >
                  <Text style={styles.toggleText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('Forgetpassword')}
              disabled={loading}
            >
              <Text style={styles.linkText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <View style={styles.register}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Registration')}
                disabled={loading}
              >
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E', // Dark background to match the image
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Semi-transparent card
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#E0E0E0', // Light text color
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0', // Light gray subtitle
    textAlign: 'center',
    marginBottom: 28,
    fontWeight: '400',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#E0E0E0', // Light text color
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent input
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    fontSize: 16,
    color: '#E0E0E0', // Light text color
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // Semi-transparent input
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: '#E0E0E0', // Light text color
  },
  toggleText: {
    color: '#A0A0A0', // Light gray toggle text
    fontWeight: '600',
    fontSize: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  linkText: {
    color: '#A0A0A0', // Light gray link text
    fontWeight: '600',
    fontSize: 14,
  },
  button: {
    backgroundColor: '#6B46C1', // Purple button color from image
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6B46C1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  buttonDisabled: {
    backgroundColor: '#60a5fa',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  register: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: '#A0A0A0', // Light gray register text
    fontSize: 14,
    fontWeight: '400',
  },
  // Error Container Styles
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 2,
  },
  errorMessage: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 18,
  },
  dismissButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    marginLeft: 8,
  },
});

export default Login;