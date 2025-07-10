import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Dimensions } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ResumeScreen = () => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(0);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        // Update the URL to match your backend route
        const response = await axios.get(`http://<YOUR_IP>:3000/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudent(response.data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, []);

  const templates = [
    // Template 1: Classic
    (data) => (
      <View style={[styles.resumeCard, { borderLeftWidth: 6, borderLeftColor: '#2563eb' }]}>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.role}>{data.course} Student</Text>
        <Text style={styles.section}>Contact</Text>
        <Text style={styles.text}>Email: {data.email}</Text>
        <Text style={styles.text}>Phone: {data.phone}</Text>
        <Text style={styles.section}>Education</Text>
        <Text style={styles.text}>{data.education}</Text>
        <Text style={styles.section}>Skills</Text>
        <Text style={styles.text}>{data.skills}</Text>
      </View>
    ),
    // Template 2: Modern Card
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#f3f4f6', borderRadius: 24, borderWidth: 0 }]}>
        <Text style={[styles.name, { color: '#0284c7' }]}>{data.name}</Text>
        <Text style={[styles.role, { color: '#0ea5e9' }]}>{data.course} Student</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.section}>Contact</Text>
            <Text style={styles.text}>{data.email}</Text>
            <Text style={styles.text}>{data.phone}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.section}>Skills</Text>
            <Text style={styles.text}>{data.skills}</Text>
          </View>
        </View>
        <Text style={styles.section}>Education</Text>
        <Text style={styles.text}>{data.education}</Text>
      </View>
    ),
    // Template 3: Half-side (Left)
    (data) => (
      <View style={styles.halfResumeContainer}>
        <View style={styles.halfLeft}>
          <Text style={[styles.name, { color: '#fff' }]}>{data.name}</Text>
          <Text style={[styles.role, { color: '#facc15' }]}>{data.course} Student</Text>
          <Text style={[styles.section, { color: '#facc15' }]}>Contact</Text>
          <Text style={[styles.text, { color: '#fff' }]}>{data.email}</Text>
          <Text style={[styles.text, { color: '#fff' }]}>{data.phone}</Text>
        </View>
        <View style={styles.halfRight}>
          <Text style={styles.section}>Education</Text>
          <Text style={styles.text}>{data.education}</Text>
          <Text style={styles.section}>Skills</Text>
          <Text style={styles.text}>{data.skills}</Text>
        </View>
      </View>
    ),
    // Template 4: Half-side (Right)
    (data) => (
      <View style={styles.halfResumeContainer}>
        <View style={styles.halfRightAlt}>
          <Text style={[styles.name, { color: '#0284c7' }]}>{data.name}</Text>
          <Text style={[styles.role, { color: '#0ea5e9' }]}>{data.course} Student</Text>
          <Text style={styles.section}>Education</Text>
          <Text style={styles.text}>{data.education}</Text>
        </View>
        <View style={styles.halfLeftAlt}>
          <Text style={[styles.section, { color: '#fff' }]}>Contact</Text>
          <Text style={[styles.text, { color: '#fff' }]}>{data.email}</Text>
          <Text style={[styles.text, { color: '#fff' }]}>{data.phone}</Text>
          <Text style={[styles.section, { color: '#fff' }]}>Skills</Text>
          <Text style={[styles.text, { color: '#fff' }]}>{data.skills}</Text>
        </View>
      </View>
    ),
  ];

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.loader}>
        <Text style={styles.text}>No student data found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.screenTitle}>Choose Your Resume Template</Text>
      {templates.map((Template, idx) => (
        <View key={idx} style={{ marginBottom: 32 }}>
          <View style={[selectedTemplate === idx && styles.selectedCard]}>
            {Template(student)}
          </View>
          <TouchableOpacity
            style={[
              styles.useButton,
              selectedTemplate === idx && styles.useButtonActive,
            ]}
            onPress={() => setSelectedTemplate(idx)}
          >
            <Text style={styles.useButtonText}>
              {selectedTemplate === idx ? 'Using This Template' : 'Use This Template'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2563eb',
    marginBottom: 24,
    textAlign: 'center',
  },
  resumeCard: {
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedCard: {
    borderColor: '#2563eb',
    borderWidth: 2,
    elevation: 8,
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  role: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  section: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 2,
    color: '#2563eb',
  },
  text: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  useButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    width: width * 0.9,
  },
  useButtonActive: {
    backgroundColor: '#22c55e',
  },
  useButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 8,
  },
  halfResumeContainer: {
    flexDirection: 'row',
    width: width * 0.9,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  halfLeft: {
    backgroundColor: '#2563eb',
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  halfRight: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  halfLeftAlt: {
    backgroundColor: '#0284c7',
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  halfRightAlt: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
});

export default ResumeScreen;