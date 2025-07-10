import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { IP } from '../ip';
import * as Animatable from 'react-native-animatable';

const ForgetPassword = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalTitle, setModalTitle] = useState('');

  // Enhanced Error Dialog Component
  const ErrorDialog = ({ visible, title, message, onClose, isSuccess = false }) => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="zoomIn" style={styles.modalContainer}>
          <View style={[styles.modalIconContainer, { backgroundColor: isSuccess ? '#10b981' : '#ef4444' }]}>
            <MaterialIcons 
              name={isSuccess ? 'check-circle' : 'error'} 
              size={40} 
              color="#fff" 
            />
          </View>
          
          <Text style={styles.modalTitle}>{title}</Text>
          <Text style={styles.modalMessage}>{message}</Text>
          
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: isSuccess ? '#10b981' : '#ef4444' }]}
            onPress={onClose}
          >
            <Text style={styles.modalButtonText}>
              {isSuccess ? 'Great!' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </Animatable.View>
      </View>
    </Modal>
  );

  const showError = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setErrorModalVisible(true);
  };

  const showSuccess = (title, message) => {
    setModalTitle(title);
    setModalMessage(message);
    setSuccessModalVisible(true);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      showError('Email Required', 'Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      showError('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://${IP}:3000/api/auth/forgot-password`, {
        email: email.toLowerCase().trim()
      });

      if (response.data.success) {
        showSuccess('OTP Sent!', 'A 6-digit OTP has been sent to your email address. Please check your inbox and enter the OTP below.');
        setStep(2);
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
      if (error.response?.status === 404) {
        showError('Email Not Found', 'No account found with this email address. Please check your email or create a new account.');
      } else if (error.response?.status === 429) {
        showError('Too Many Requests', 'Please wait before requesting another OTP.');
      } else if (error.code === 'NETWORK_ERROR') {
        showError('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        showError('Error', error.response?.data?.message || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      showError('OTP Required', 'Please enter the 6-digit OTP sent to your email.');
      return;
    }

    if (otp.length !== 6) {
      showError('Invalid OTP', 'OTP must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://${IP}:3000/api/auth/verify-otp`, {
        email: email.toLowerCase().trim(),
        otp: otp.trim()
      });

      if (response.data.success) {
        showSuccess('OTP Verified!', 'OTP verified successfully. Now please create a new strong password.');
        setStep(3);
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
      if (error.response?.status === 400) {
        showError('Invalid OTP', 'The OTP you entered is incorrect or has expired. Please try again.');
      } else if (error.response?.status === 429) {
        showError('Too Many Attempts', 'Too many failed attempts. Please request a new OTP.');
      } else if (error.code === 'NETWORK_ERROR') {
        showError('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        showError('Error', error.response?.data?.message || 'Failed to verify OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      showError('Password Required', 'Please enter a new password.');
      return;
    }

    if (!validatePassword(newPassword)) {
      showError('Weak Password', 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Password Mismatch', 'Password and confirm password do not match. Please try again.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`http://${IP}:3000/api/auth/reset-password`, {
        email: email.toLowerCase().trim(),
        otp: otp.trim(),
        newPassword: newPassword
      });

      if (response.data.success) {
        showSuccess('Password Reset Successful!', 'Your password has been reset successfully. You can now login with your new password.');
        // Navigate to login after success
        setTimeout(() => {
          setSuccessModalVisible(false);
          navigation.navigate('Login');
        }, 2000);
      }
    } catch (error) {
      console.error('Reset Password Error:', error);
      if (error.response?.status === 400) {
        showError('Reset Failed', 'Invalid or expired OTP. Please start the process again.');
      } else if (error.code === 'NETWORK_ERROR') {
        showError('Network Error', 'Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        showError('Error', error.response?.data?.message || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setOtp('');
    await handleSendOTP();
  };

  const renderStep1 = () => (
    <Animatable.View animation="fadeInUp" style={styles.stepContainer}>
      <MaterialIcons name="email" size={60} color="#2563eb" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Forgot Password?</Text>
      <Text style={styles.stepDescription}>
        Enter your email address and we'll send you a 6-digit OTP to reset your password.
      </Text>

      <View style={styles.inputContainer}>
        <MaterialIcons name="email" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSendOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Send OTP</Text>
        )}
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderStep2 = () => (
    <Animatable.View animation="fadeInUp" style={styles.stepContainer}>
      <MaterialIcons name="security" size={60} color="#2563eb" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Enter OTP</Text>
      <Text style={styles.stepDescription}>
        We've sent a 6-digit OTP to {email}. Please enter it below.
      </Text>

      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
          maxLength={6}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleVerifyOTP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Verify OTP</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={handleResendOTP}>
        <Text style={styles.linkText}>Didn't receive OTP? Resend</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkButton} onPress={() => setStep(1)}>
        <Text style={styles.linkText}>Change Email Address</Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  const renderStep3 = () => (
    <Animatable.View animation="fadeInUp" style={styles.stepContainer}>
      <MaterialIcons name="lock-reset" size={60} color="#2563eb" style={styles.stepIcon} />
      <Text style={styles.stepTitle}>Create New Password</Text>
      <Text style={styles.stepDescription}>
        Create a strong password with at least 8 characters, including uppercase, lowercase, and numbers.
      </Text>

      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Enter new password"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowPassword(!showPassword)}
        >
          <MaterialIcons
            name={showPassword ? "visibility" : "visibility-off"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <MaterialIcons name="lock" size={20} color="#6b7280" style={styles.inputIcon} />
        <TextInput
          style={styles.textInput}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <MaterialIcons
            name={showConfirmPassword ? "visibility" : "visibility-off"}
            size={20}
            color="#6b7280"
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Reset Password</Text>
        )}
      </TouchableOpacity>
    </Animatable.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#2563eb" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
        </View>

        <View style={styles.progressContainer}>
          {[1, 2, 3].map((stepNumber) => (
            <View key={stepNumber} style={styles.progressStep}>
              <View
                style={[
                  styles.progressCircle,
                  step >= stepNumber && styles.progressCircleActive
                ]}
              >
                <Text
                  style={[
                    styles.progressText,
                    step >= stepNumber && styles.progressTextActive
                  ]}
                >
                  {stepNumber}
                </Text>
              </View>
              {stepNumber < 3 && (
                <View
                  style={[
                    styles.progressLine,
                    step > stepNumber && styles.progressLineActive
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>Remember your password? Login</Text>
        </TouchableOpacity>
      </ScrollView>

      <ErrorDialog
        visible={errorModalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setErrorModalVisible(false)}
        isSuccess={false}
      />

      <ErrorDialog
        visible={successModalVisible}
        title={modalTitle}
        message={modalMessage}
        onClose={() => setSuccessModalVisible(false)}
        isSuccess={true}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleActive: {
    backgroundColor: '#2563eb',
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  progressTextActive: {
    color: '#fff',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  progressLineActive: {
    backgroundColor: '#2563eb',
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  stepIcon: {
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    padding: 4,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    padding: 8,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 16,
    textAlign: 'center',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 20,
  },
  loginLinkText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
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
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ForgetPassword;