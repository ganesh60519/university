import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';
import axios from 'axios';
import { IP } from '../../ip';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ticketId, updates } = route.params;
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    branch: '',
    education: '',
    skills: '',
    work_experience: '',
    projects: '',
    certifications: '',
    achievements: '',
    languages: '',
    hobbies: '',
    phone: '',
    address: '',
    profile_picture: '',
    dob: '',
    father_name: '',
    mother_name: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    objective: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const response = await axios.get(`http://${IP}:3000/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data) {
          setProfile({
            name: response.data.name || '',
            email: response.data.email || '',
            branch: response.data.branch || '',
            education: response.data.education || '',
            skills: response.data.skills || '',
            work_experience: response.data.work_experience || '',
            projects: response.data.projects || '',
            certifications: response.data.certifications || '',
            achievements: response.data.achievements || '',
            languages: response.data.languages || '',
            hobbies: response.data.hobbies || '',
            phone: response.data.phone || '',
            address: response.data.address || '',
            profile_picture: response.data.profile_picture || '',
            dob: response.data.dob ?? '', // <-- do not use || '', use ?? '' to avoid defaulting to today if dob is null/undefined
            father_name: response.data.father_name || '',
            mother_name: response.data.mother_name || '',
            linkedin_url: response.data.linkedin_url || '',
            github_url: response.data.github_url || '',
            portfolio_url: response.data.portfolio_url || '',
            objective: response.data.objective || ''
          });
        } else {
          throw new Error('Invalid profile data');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        Alert.alert('Error', 'Failed to load profile data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const validateInputs = () => {
    const newErrors = {};
    if (!profile.name.trim()) newErrors.name = 'Name is required';
    if (!profile.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) newErrors.email = 'Invalid email format';
    if (!profile.branch.trim()) newErrors.branch = 'Branch is required';
    if (profile.phone && !/^\+?\d{10,15}$/.test(profile.phone)) newErrors.phone = 'Invalid phone number (10-15 digits)';
    if (profile.dob && !/^\d{4}-\d{2}-\d{2}$/.test(profile.dob)) newErrors.dob = 'Invalid date format (YYYY-MM-DD)';
    if (profile.linkedin_url && !profile.linkedin_url.trim()) newErrors.linkedin_url = 'LinkedIn URL cannot be empty if provided';
    if (profile.github_url && !profile.github_url.trim()) newErrors.github_url = 'GitHub URL cannot be empty if provided';
    if (profile.portfolio_url && !profile.portfolio_url.trim()) newErrors.portfolio_url = 'Portfolio URL cannot be empty if provided';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateInputs()) {
      Alert.alert('Error', 'Please fix the errors in the form');
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.put(
        `http://${IP}:3000/api/student/profile`,
        {
          ticket_id: ticketId,
          updates: {
            name: profile.name.trim(),
            email: profile.email.trim(),
            branch: profile.branch.trim(),
            education: profile.education,
            skills: profile.skills,
            work_experience: profile.work_experience,
            projects: profile.projects,
            certifications: profile.certifications,
            achievements: profile.achievements,
            languages: profile.languages,
            hobbies: profile.hobbies,
            phone: profile.phone.trim(),
            address: profile.address.trim(),
            profile_picture: profile.profile_picture.trim(),
            dob: profile.dob.trim(),
            father_name: profile.father_name.trim(),
            mother_name: profile.mother_name.trim(),
            linkedin_url: profile.linkedin_url.trim(),
            github_url: profile.github_url.trim(),
            portfolio_url: profile.portfolio_url.trim(),
            objective: profile.objective.trim()
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        Alert.alert(
          'Success',
          'Profile updated successfully',
          [{ text: 'OK', onPress: () => navigation.navigate('StudentDashboard') }]
        );
      } else {
        throw new Error('Profile update failed');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert(
        'Error',
        `Failed to update profile: ${error.response?.data?.error || error.message || 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('StudentDashboard');
  };

  const pickImage = async () => {
    try {
      // Request permission to access media library
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile pictures
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadProfileImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadProfileImage = async (imageAsset) => {
    try {
      setImageUploading(true);
      
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Create FormData for file upload
      const formData = new FormData();
      
      // For React Native, we need to format the file object correctly
      const fileUri = imageAsset.uri;
      const fileType = imageAsset.mimeType || imageAsset.type || 'image/jpeg';
      const fileName = imageAsset.fileName || `profile_${Date.now()}.jpg`;
      
      formData.append('profileImage', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      console.log('Uploading profile image:', { fileUri, fileType, fileName });

      const response = await axios.post(
        `http://${IP}:3000/api/upload/profile-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        // Update profile state with the new image URL
        setProfile(prev => ({
          ...prev,
          profile_picture: response.data.profileImage.url
        }));
        Alert.alert('Success', 'Profile image uploaded successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert(
        'Upload Error', 
        `Failed to upload image: ${error.response?.data?.error || error.message || 'Unknown error'}`
      );
    } finally {
      setImageUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileCard}>
          <Text style={styles.title}>Edit Profile</Text>

          {/* Personal Information Section */}
          <Text style={styles.sectionHeader}>Personal Information</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={profile.name}
              onChangeText={(text) => setProfile({ ...profile, name: text })}
              placeholder="Enter your name"
              placeholderTextColor="#9ca3af"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={profile.email}
              onChangeText={(text) => setProfile({ ...profile, email: text })}
              placeholder="Enter your email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Branch *</Text>
            <TextInput
              style={[styles.input, errors.branch && styles.inputError]}
              value={profile.branch}
              onChangeText={(text) => setProfile({ ...profile, branch: text })}
              placeholder="Enter your branch"
              placeholderTextColor="#9ca3af"
            />
            {errors.branch && <Text style={styles.errorText}>{errors.branch}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={profile.phone}
              onChangeText={(text) => setProfile({ ...profile, phone: text })}
              placeholder="e.g., +1234567890"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={[styles.input, errors.dob && styles.inputError]}
              value={profile.dob}
              onChangeText={(text) => setProfile({ ...profile, dob: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
            />
            {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Father's Name</Text>
            <TextInput
              style={styles.input}
              value={profile.father_name}
              onChangeText={(text) => setProfile({ ...profile, father_name: text })}
              placeholder="Enter father's name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Mother's Name</Text>
            <TextInput
              style={styles.input}
              value={profile.mother_name}
              onChangeText={(text) => setProfile({ ...profile, mother_name: text })}
              placeholder="Enter mother's name"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={profile.address}
              onChangeText={(text) => setProfile({ ...profile, address: text })}
              placeholder="Enter your address"
              placeholderTextColor="#9ca3af"
              multiline
            />
          </View>

          {/* Online Presence Section */}
          <Text style={styles.sectionHeader}>Online Presence</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Profile Picture</Text>
            <View style={styles.imagePickerContainer}>
              {profile.profile_picture ? (
                <View style={styles.imagePreviewContainer}>
                  <Image 
                    source={{ uri: `http://${IP}:3000${profile.profile_picture}` }} 
                    style={styles.profileImagePreview}
                    onError={() => {
                      // If image fails to load, show placeholder
                      setProfile(prev => ({ ...prev, profile_picture: '' }));
                    }}
                  />
                  <TouchableOpacity 
                    style={styles.changeImageButton}
                    onPress={pickImage}
                    disabled={imageUploading}
                  >
                    <Text style={styles.changeImageButtonText}>
                      {imageUploading ? 'Uploading...' : 'Change Image'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadImageButton}
                  onPress={pickImage}
                  disabled={imageUploading}
                >
                  <Text style={styles.uploadImageButtonText}>
                    {imageUploading ? 'Uploading...' : '📷 Upload Profile Picture'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>LinkedIn URL</Text>
            <TextInput
              style={[styles.input, errors.linkedin_url && styles.inputError]}
              value={profile.linkedin_url}
              onChangeText={(text) => setProfile({ ...profile, linkedin_url: text })}
              placeholder="Enter LinkedIn URL"
              placeholderTextColor="#9ca3af"
              keyboardType="url"
            />
            {errors.linkedin_url && <Text style={styles.errorText}>{errors.linkedin_url}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>GitHub URL</Text>
            <TextInput
              style={[styles.input, errors.github_url && styles.inputError]}
              value={profile.github_url}
              onChangeText={(text) => setProfile({ ...profile, github_url: text })}
              placeholder="Enter GitHub URL"
              placeholderTextColor="#9ca3af"
              keyboardType="url"
            />
            {errors.github_url && <Text style={styles.errorText}>{errors.github_url}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Portfolio URL</Text>
            <TextInput
              style={[styles.input, errors.portfolio_url && styles.inputError]}
              value={profile.portfolio_url}
              onChangeText={(text) => setProfile({ ...profile, portfolio_url: text })}
              placeholder="Enter portfolio URL"
              placeholderTextColor="#9ca3af"
              keyboardType="url"
            />
            {errors.portfolio_url && <Text style={styles.errorText}>{errors.portfolio_url}</Text>}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Career Objective</Text>
            <TextInput
              style={[styles.input, { height: 100 }]}
              value={profile.objective}
              onChangeText={(text) => setProfile({ ...profile, objective: text })}
              placeholder="Enter your career objective"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Update Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, isLoading && styles.buttonDisabled]}
              onPress={handleCancel}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 20,
    marginBottom: 10,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
  },
  cancelButton: {
    backgroundColor: '#dc2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  imagePreviewContainer: {
    alignItems: 'center',
  },
  profileImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#e5e7eb',
    marginBottom: 12,
  },
  changeImageButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  changeImageButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  uploadImageButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  uploadImageButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default EditProfileScreen;