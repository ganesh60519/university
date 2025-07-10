import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { IP } from '../ip';
import { Picker } from '@react-native-picker/picker';

const Registration = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [branch, setBranch] = useState('CSE');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const branches = [
    { label: 'Computer Science', value: 'CSE' },
    { label: 'Information Science', value: 'ISE' },
    { label: 'Electronics & Communication', value: 'ECE' },
    { label: 'Civil Engineering', value: 'CIVIL' },
    { label: 'Mechanical Engineering', value: 'MECH' },
  ];

  const handleRegister = async () => {
    try {
      setIsLoading(true);
      if (!name || !email || !password) {
        Alert.alert('Error', 'Please fill in all fields');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }

      const endpoint =
        role === 'admin'
          ? 'admin/register'
          : role === 'faculty'
          ? 'faculty/register'
          : 'student/register';

      const response = await axios.post(`http://${IP}:3000/api/${endpoint}`, {
        name,
        email,
        password,
        branch: role === 'admin' ? null : branch,
      });

      if (response.data.success) {
        Alert.alert('Success', 'Registration successful!', [
          { text: 'OK', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage =
        error.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          <View style={styles.card}>
            <Text style={styles.title}>Welcome Aboard</Text>
            <Text style={styles.subtitle}>Create your account to begin</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#9ca3af"
                autoCapitalize="words"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
                editable={!isLoading}
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
                  placeholderTextColor="#9ca3af"
                  editable={!isLoading}
                />
                <TouchableOpacity 
                  style={styles.passwordVisibilityToggle}
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                  disabled={isLoading}
                >
                  <Text style={styles.passwordVisibilityText}>
                    {isPasswordVisible ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.pickerGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={role}
                  style={styles.picker}
                  onValueChange={(itemValue) => {
                    setRole(itemValue);
                    if (itemValue === 'admin') {
                      setBranch('');
                    } else {
                      setBranch('CSE');
                    }
                  }}
                  enabled={!isLoading}
                >
                  <Picker.Item label="Student" value="student" />
                  <Picker.Item label="Faculty" value="faculty" />
                  <Picker.Item label="Admin" value="admin" />
                </Picker>
              </View>
            </View>

            {role !== 'admin' && (
              <View style={styles.pickerGroup}>
                <Text style={styles.label}>Branch</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={branch}
                    style={styles.picker}
                    onValueChange={(itemValue) => setBranch(itemValue)}
                    enabled={!isLoading}
                  >
                    {branches.map((b) => (
                      <Picker.Item key={b.value} label={b.label} value={b.value} />
                    ))}
                  </Picker>
                </View>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.registerButton, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Sign Up</Text>
              )}
            </TouchableOpacity>

            <View style={styles.loginRedirectContainer}>
              <Text style={styles.loginRedirectText}>Have an account? </Text>
              <TouchableOpacity 
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f97316', // bg-orange-500
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  innerContainer: {
    paddingHorizontal: 16,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#ffffff', // bg-white
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#1f2937', // text-gray-800
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280', // text-gray-500
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#1f2937', // text-gray-800
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#1f2937', // text-gray-800
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937', // text-gray-800
  },
  passwordVisibilityToggle: {
    paddingHorizontal: 16,
  },
  passwordVisibilityText: {
    color: '#f97316', // text-orange-500
    fontSize: 14,
    fontWeight: '600',
  },
  pickerGroup: {
    marginBottom: 16,
  },
  pickerContainer: {
    backgroundColor: '#f3f4f6', // bg-gray-100
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db', // border-gray-300
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'android' ? 50 : undefined,
    width: '100%',
    color: '#1f2937', // text-gray-800
  },
  registerButton: {
    backgroundColor: '#f97316', // bg-orange-500
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#fb923c', // bg-orange-400
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff', // text-white
    fontSize: 16,
    fontWeight: '600',
  },
  loginRedirectContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginRedirectText: {
    color: '#6b7280', // text-gray-500
    fontSize: 14,
  },
  loginLink: {
    color: '#f97316', // text-orange-500
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Registration;