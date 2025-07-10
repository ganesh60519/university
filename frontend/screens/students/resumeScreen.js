import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, ActivityIndicator, Modal, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as MediaLibrary from 'expo-media-library';
import { MaterialIcons } from '@expo/vector-icons';
import { IP } from '../../ip'; // Assuming IP is exported from a config file

const { width } = Dimensions.get('window');

const ResumeModal = ({ visible, onClose, children }) => (
  <Modal
    visible={visible}
    animationType="fade"
    transparent={true}
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <ScrollView>{children}</ScrollView>
        <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
          <Text style={styles.closeModalButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const ResumeScreen = () => {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const scrollViewRef = useRef();

  useEffect(() => {
    let isMounted = true;
    const fetchStudent = async () => {
      try {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          if (isMounted) {
            Alert.alert('Error', 'No authentication token found. Please log in again.', [
              { text: 'OK', onPress: () => navigation.navigate('Login') }
            ]);
            setStudentData(null);
          }
          return;
        }

        if (!IP) {
          if (isMounted) {
            Alert.alert('Error', 'Server configuration missing.');
            setStudentData(null);
          }
          return;
        }

        const response = await axios.get(`http://${IP}:3000/api/student/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }).catch(error => {
          throw {
            response: error.response,
            message: error.message,
            code: error.code
          };
        });

        if (isMounted) {
          const data = response.data;
          const normalized = {
            name: data.name || 'Your Name',
            email: data.email || 'email@example.com',
            branch: data.branch || 'Branch',
            phone: data.phone || data.personal_details?.phone || '+1 234 567 8900',
            address: data.address || data.personal_details?.address || 'Your Address',
            dob: data.dob || data.personal_details?.dob || 'YYYY-MM-DD',
            father_name: data.father_name || data.personal_details?.father_name || 'Not Provided',
            mother_name: data.mother_name || data.personal_details?.mother_name || 'Not Provided',
            rollNo: data.rollNo || 'Not Provided',
            year: data.year || 'Not Provided',
            objective: data.objective || data.personal_details?.objective || 'A dedicated professional with a passion for learning and growth.',
            linkedin_url: data.linkedin_url || data.personal_details?.linkedin_url || 'linkedin.com/in/yourprofile',
            github_url: data.github_url || data.personal_details?.github_url || 'github.com/yourprofile',
            portfolio_url: data.portfolio_url || data.personal_details?.portfolio_url || '',
            skills: Array.isArray(data.skills)
              ? data.skills.map(s => s.skill_name || s)
              : ['Skill 1', 'Skill 2'],
            education: Array.isArray(data.education)
              ? data.education.map(e => ({
                  degree: e.degree || 'Degree',
                  field: e.branch || e.field || 'Field',
                  institute: e.institution_name || e.institute || 'Institute',
                  year: (e.start_year && e.end_year) ? `${e.start_year} - ${e.end_year}` : (e.year || 'Year'),
                  grade: e.grade || 'Not Provided'
                }))
              : [{ degree: 'Degree', field: 'Field', institute: 'Institute', year: 'Year', grade: 'Not Provided' }],
            work_experience: Array.isArray(data.work_experience)
              ? data.work_experience.map(w => ({
                  company: w.company_name || w.company || 'Company',
                  role: w.role || 'Role',
                  duration: (w.start_date && w.end_date) ? `${w.start_date} - ${w.end_date}` : 'Duration',
                  description: w.description || 'Description of responsibilities and achievements.'
                }))
              : [],
            projects: Array.isArray(data.projects)
              ? data.projects.map(p => ({
                  title: p.project_title || p.title || 'Project Title',
                  description: p.description || 'Project description.',
                  link: p.project_link || p.link || '',
                  technologies: p.technologies_used || 'Technologies used'
                }))
              : [],
            certifications: Array.isArray(data.certifications)
              ? data.certifications.map(c => ({
                  name: c.certificate_name || c.name || 'Certification',
                  year: c.issue_date || c.year || 'Year',
                  organization: c.issuing_organization || 'Organization',
                  link: c.certificate_link || ''
                }))
              : [],
            achievements: Array.isArray(data.achievements)
              ? data.achievements.map(a => a.title || a.description || a || 'Achievement')
              : [],
            languages: Array.isArray(data.languages)
              ? data.languages.map(l => l.language_name || l || 'Language')
              : ['English'],
            hobbies: Array.isArray(data.hobbies)
              ? data.hobbies.map(h => h.hobby_name || h || 'Hobby')
              : [],
            resume_references: Array.isArray(data.resume_references)
              ? data.resume_references.map(r => ({
                  name: r.reference_name || r.name || 'Reference Name',
                  relation: r.relation || 'Relation',
                  contact: r.contact_info || r.contact || 'Contact Info'
                }))
              : [],
            personal_details: data.personal_details || {}
          };
          setStudentData(normalized);
        }
      } catch (error) {
        if (isMounted) {
          let errorMessage = 'Unable to load profile data. Please try again.';
          if (error.response) {
            if (error.response.status === 401) {
              errorMessage = 'Authentication failed. Please log in again.';
              Alert.alert('Error', errorMessage, [
                { text: 'OK', onPress: () => navigation.navigate('Login') }
              ]);
            } else if (error.response.status === 404) {
              errorMessage = 'Profile not found. Please complete your profile setup.';
            } else {
              errorMessage = error.response.data?.error || 'Server error occurred.';
            }
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timed out. Please check your network connection.';
          } else if (error.request) {
            errorMessage = 'No response from server. Please check your network.';
          }
          console.error('Profile fetch error:', error);
          Alert.alert('Error', errorMessage);
          setStudentData(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchStudent();
    return () => { isMounted = false; };
  }, [navigation]);

  const templates = [
    // Template 1: Modern Tech Resume (Blue gradient theme)
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
        {/* Header with gradient background */}
        <View style={[styles.techHeader, { 
          backgroundColor: '#1e40af',
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
          padding: 30,
          position: 'relative'
        }]}>
          <View style={styles.techPattern}>
            <View style={[styles.techShape, { backgroundColor: '#ffffff', opacity: 0.1 }]} />
            <View style={[styles.techShape, { backgroundColor: '#ffffff', opacity: 0.05, top: 15, left: 30 }]} />
          </View>
          <View style={styles.techProfile}>
            <View style={styles.techImageContainer}>
              <MaterialIcons name="code" size={60} color="#ffffff" />
            </View>
            <View style={styles.techInfo}>
              <Text style={[styles.name, { fontSize: 32, color: '#ffffff', fontWeight: '800', letterSpacing: 0.5 }]}>
                {data?.name}
              </Text>
              <Text style={[styles.role, { fontSize: 18, color: '#bfdbfe', fontWeight: '600', marginBottom: 15 }]}>
                {data?.branch}
              </Text>
              <View style={styles.techContactRow}>
                <View style={styles.techContactItem}>
                  <MaterialIcons name="email" size={14} color="#bfdbfe" />
                  <Text style={styles.techContactText}>{data?.email}</Text>
                </View>
                <View style={styles.techContactItem}>
                  <MaterialIcons name="phone" size={14} color="#bfdbfe" />
                  <Text style={styles.techContactText}>{data?.phone}</Text>
                </View>
                <View style={styles.techContactItem}>
                  <MaterialIcons name="link" size={14} color="#bfdbfe" />
                  <Text style={styles.techContactText}>{data?.linkedin_url}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View style={[styles.techContent, { padding: 25 }]}>
          {/* Professional Summary */}
          <View style={[styles.section, { marginBottom: 25 }]}>
            <View style={styles.techSectionHeader}>
              <View style={styles.techSectionAccent} />
              <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16, fontWeight: '700' }]}>
                PROFESSIONAL SUMMARY
              </Text>
            </View>
            <Text style={[styles.sectionContent, { fontSize: 14, lineHeight: 22, color: '#374151' }]}>
              {data?.objective}
            </Text>
          </View>

          {/* Skills Section */}
          <View style={[styles.section, { marginBottom: 25 }]}>
            <View style={styles.techSectionHeader}>
              <View style={styles.techSectionAccent} />
              <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16, fontWeight: '700' }]}>
                TECHNICAL SKILLS
              </Text>
            </View>
            <View style={styles.techSkillsGrid}>
              {(data?.skills || []).slice(0, 12).map((skill, i) => (
                <View key={i} style={styles.techSkillBadge}>
                  <Text style={styles.techSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Experience and Education in two columns */}
          <View style={styles.techTwoColumn}>
            {/* Left Column - Experience */}
            <View style={[styles.column, { width: '60%', paddingRight: 15 }]}>
              <View style={styles.section}>
                <View style={styles.techSectionHeader}>
                  <View style={styles.techSectionAccent} />
                  <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                    WORK EXPERIENCE
                  </Text>
                </View>
                {(data?.work_experience || []).map((exp, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 20 }]}>
                    <Text style={[styles.itemTitle, { color: '#1e40af', fontSize: 15, fontWeight: '700' }]}>
                      {exp.role}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 13 }]}>
                      {exp.company} | {exp.duration}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 5, lineHeight: 20, fontSize: 13 }]}>
                      {exp.description}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <View style={styles.techSectionHeader}>
                  <View style={styles.techSectionAccent} />
                  <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                    PROJECTS
                  </Text>
                </View>
                {(data?.projects || []).map((proj, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 15 }]}>
                    <Text style={[styles.itemTitle, { color: '#1e40af', fontSize: 14, fontWeight: '700' }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 3, lineHeight: 18, fontSize: 12 }]}>
                      {proj.description}
                    </Text>
                    <Text style={[styles.itemLink, { color: '#3b82f6', fontWeight: '600', marginTop: 3, fontSize: 12 }]}>
                      {proj.technologies ? `Tech: ${proj.technologies}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right Column - Education & Others */}
            <View style={[styles.column, { width: '40%', paddingLeft: 15 }]}>
              <View style={styles.section}>
                <View style={styles.techSectionHeader}>
                  <View style={styles.techSectionAccent} />
                  <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                    EDUCATION
                  </Text>
                </View>
                {(data?.education || []).map((edu, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 15 }]}>
                    <Text style={[styles.itemTitle, { color: '#1e40af', fontSize: 13, fontWeight: '700' }]}>
                      {edu.degree}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 11 }]}>
                      {edu.institute}
                    </Text>
                    <Text style={[styles.itemDetail, { fontSize: 11, color: '#6b7280' }]}>
                      {edu.year} {edu.grade ? '• ' + edu.grade : ''}
                    </Text>
                  </View>
                ))}
              </View>

              {data?.certifications && data.certifications.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.techSectionHeader}>
                    <View style={styles.techSectionAccent} />
                    <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                      CERTIFICATIONS
                    </Text>
                  </View>
                  {data.certifications.map((cert, i) => (
                    <View key={i} style={[styles.itemContainer, { marginBottom: 10 }]}>
                      <Text style={[styles.itemTitle, { color: '#1e40af', fontSize: 12, fontWeight: '700' }]}>
                        {cert.name}
                      </Text>
                      <Text style={[styles.itemDetail, { fontSize: 10, color: '#6b7280' }]}>
                        {cert.organization} • {cert.year}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {data?.achievements && data.achievements.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.techSectionHeader}>
                    <View style={styles.techSectionAccent} />
                    <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                      ACHIEVEMENTS
                    </Text>
                  </View>
                  {data.achievements.map((achievement, i) => (
                    <View key={i} style={[styles.itemContainer, { marginBottom: 8 }]}>
                      <Text style={[styles.itemDetail, { fontSize: 11, color: '#374151' }]}>
                        • {achievement}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {data?.languages && data.languages.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.techSectionHeader}>
                    <View style={styles.techSectionAccent} />
                    <Text style={[styles.sectionTitle, { color: '#1e40af', fontSize: 16 }]}>
                      LANGUAGES
                    </Text>
                  </View>
                  <View style={styles.languageContainer}>
                    {data.languages.map((lang, i) => (
                      <Text key={i} style={[styles.itemDetail, { fontSize: 12, color: '#374151', marginBottom: 3 }]}>
                        • {lang}
                      </Text>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    ),

    // Template 2: Executive Professional (Premium Design)
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
        {/* Header with geometric design */}
        <View style={[styles.executiveHeader, { 
          backgroundColor: '#0f172a',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          padding: 30,
          position: 'relative'
        }]}>
          <View style={styles.geometricPattern}>
            <View style={[styles.geometricShape, { backgroundColor: '#3b82f6', opacity: 0.1 }]} />
            <View style={[styles.geometricShape, { backgroundColor: '#06b6d4', opacity: 0.1, top: 20, left: 40 }]} />
          </View>
          <View style={styles.executiveProfile}>
            <View style={styles.executiveImageContainer}>
              <MaterialIcons name="account-circle" size={80} color="#ffffff" />
            </View>
            <View style={styles.executiveInfo}>
              <Text style={[styles.name, { fontSize: 36, color: '#ffffff', fontWeight: '800', letterSpacing: 1 }]}>
                {data?.name}
              </Text>
              <Text style={[styles.role, { fontSize: 20, color: '#94a3b8', fontWeight: '600', marginBottom: 15 }]}>
                {data?.branch}
              </Text>
              <View style={styles.executiveContactRow}>
                <View style={styles.executiveContactItem}>
                  <MaterialIcons name="email" size={16} color="#94a3b8" />
                  <Text style={styles.executiveContactText}>{data?.email}</Text>
                </View>
                <View style={styles.executiveContactItem}>
                  <MaterialIcons name="phone" size={16} color="#94a3b8" />
                  <Text style={styles.executiveContactText}>{data?.phone}</Text>
                </View>
                <View style={styles.executiveContactItem}>
                  <MaterialIcons name="link" size={16} color="#94a3b8" />
                  <Text style={styles.executiveContactText}>{data?.linkedin_url}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Content Area */}
        <View style={[styles.executiveContent, { padding: 30 }]}>
          {/* Professional Summary with accent */}
          <View style={[styles.section, { marginBottom: 30 }]}>
            <View style={styles.executiveSectionHeader}>
              <View style={styles.executiveSectionAccent} />
              <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }]}>
                EXECUTIVE SUMMARY
              </Text>
            </View>
            <Text style={[styles.sectionContent, { fontSize: 15, lineHeight: 24, color: '#374151', fontWeight: '400' }]}>
              {data?.objective}
            </Text>
          </View>

          {/* Core Competencies */}
          <View style={[styles.section, { marginBottom: 30 }]}>
            <View style={styles.executiveSectionHeader}>
              <View style={styles.executiveSectionAccent} />
              <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 18, fontWeight: '800' }]}>
                CORE COMPETENCIES
              </Text>
            </View>
            <View style={styles.executiveSkillsGrid}>
              {(data?.skills || []).slice(0, 15).map((skill, i) => (
                <View key={i} style={styles.executiveSkillBadge}>
                  <Text style={styles.executiveSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Professional Experience */}
          <View style={[styles.section, { marginBottom: 30 }]}>
            <View style={styles.executiveSectionHeader}>
              <View style={styles.executiveSectionAccent} />
              <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 18, fontWeight: '800' }]}>
                PROFESSIONAL EXPERIENCE
              </Text>
            </View>
            {(data?.work_experience || []).map((exp, i) => (
              <View key={i} style={[styles.itemContainer, { marginBottom: 25, paddingLeft: 20, borderLeft: '3px solid #e5e7eb' }]}>
                <Text style={[styles.itemTitle, { color: '#0f172a', fontSize: 17, fontWeight: '800' }]}>
                  {exp.role}
                </Text>
                <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 15, fontWeight: '600' }]}>
                  {exp.company} | {exp.duration}
                </Text>
                <Text style={[styles.itemDetail, { marginTop: 8, lineHeight: 22, fontSize: 14, color: '#374151' }]}>
                  {exp.description}
                </Text>
              </View>
            ))}
          </View>

          {/* Education & Projects in two columns */}
          <View style={styles.executiveTwoColumn}>
            {/* Left Column - Education */}
            <View style={[styles.column, { width: '48%', paddingRight: 15 }]}>
              <View style={styles.section}>
                <View style={styles.executiveSectionHeader}>
                  <View style={styles.executiveSectionAccent} />
                  <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                    EDUCATION
                  </Text>
                </View>
                {(data?.education || []).map((edu, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 18 }]}>
                    <Text style={[styles.itemTitle, { color: '#0f172a', fontSize: 15, fontWeight: '700' }]}>
                      {edu.degree}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 13 }]}>
                      {edu.institute}
                    </Text>
                    <Text style={[styles.itemDetail, { fontSize: 13, color: '#6b7280' }]}>
                      {edu.year} {edu.grade ? '• ' + edu.grade : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right Column - Projects */}
            <View style={[styles.column, { width: '48%', paddingLeft: 15 }]}>
              <View style={styles.section}>
                <View style={styles.executiveSectionHeader}>
                  <View style={styles.executiveSectionAccent} />
                  <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                    KEY PROJECTS
                  </Text>
                </View>
                {(data?.projects || []).map((proj, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 15 }]}>
                    <Text style={[styles.itemTitle, { color: '#0f172a', fontSize: 14, fontWeight: '700' }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 3, lineHeight: 18, fontSize: 12 }]}>
                      {proj.description}
                    </Text>
                    <Text style={[styles.itemLink, { color: '#3b82f6', fontWeight: '600', marginTop: 3, fontSize: 11 }]}>
                      {proj.technologies ? `Technologies: ${proj.technologies}` : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Certifications & Achievements */}
          {((data?.certifications && data.certifications.length > 0) || (data?.achievements && data.achievements.length > 0)) && (
            <View style={styles.executiveTwoColumn}>
              {/* Certifications */}
              {data?.certifications && data.certifications.length > 0 && (
                <View style={[styles.column, { width: '48%', paddingRight: 15 }]}>
                  <View style={styles.section}>
                    <View style={styles.executiveSectionHeader}>
                      <View style={styles.executiveSectionAccent} />
                      <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                        CERTIFICATIONS
                      </Text>
                    </View>
                    {data.certifications.map((cert, i) => (
                      <View key={i} style={[styles.itemContainer, { marginBottom: 12 }]}>
                        <Text style={[styles.itemTitle, { color: '#0f172a', fontSize: 13, fontWeight: '700' }]}>
                          {cert.name}
                        </Text>
                        <Text style={[styles.itemDetail, { fontSize: 11, color: '#6b7280' }]}>
                          {cert.organization} • {cert.year}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Achievements */}
              {data?.achievements && data.achievements.length > 0 && (
                <View style={[styles.column, { width: '48%', paddingLeft: 15 }]}>
                  <View style={styles.section}>
                    <View style={styles.executiveSectionHeader}>
                      <View style={styles.executiveSectionAccent} />
                      <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                        ACHIEVEMENTS
                      </Text>
                    </View>
                    {data.achievements.map((achievement, i) => (
                      <View key={i} style={[styles.itemContainer, { marginBottom: 8 }]}>
                        <Text style={[styles.itemDetail, { fontSize: 12, color: '#374151', fontWeight: '500' }]}>
                          • {achievement}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Languages & Hobbies */}
          {((data?.languages && data.languages.length > 0) || (data?.hobbies && data.hobbies.length > 0)) && (
            <View style={styles.executiveTwoColumn}>
              {/* Languages */}
              {data?.languages && data.languages.length > 0 && (
                <View style={[styles.column, { width: '48%', paddingRight: 15 }]}>
                  <View style={styles.section}>
                    <View style={styles.executiveSectionHeader}>
                      <View style={styles.executiveSectionAccent} />
                      <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                        LANGUAGES
                      </Text>
                    </View>
                    <View style={styles.languageContainer}>
                      {data.languages.map((lang, i) => (
                        <Text key={i} style={[styles.itemDetail, { fontSize: 13, color: '#374151', marginBottom: 5 }]}>
                          • {lang}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Hobbies */}
              {data?.hobbies && data.hobbies.length > 0 && (
                <View style={[styles.column, { width: '48%', paddingLeft: 15 }]}>
                  <View style={styles.section}>
                    <View style={styles.executiveSectionHeader}>
                      <View style={styles.executiveSectionAccent} />
                      <Text style={[styles.sectionTitle, { color: '#0f172a', fontSize: 16, fontWeight: '800' }]}>
                        INTERESTS
                      </Text>
                    </View>
                    <View style={styles.hobbiesContainer}>
                      {data.hobbies.map((hobby, i) => (
                        <Text key={i} style={[styles.itemDetail, { fontSize: 13, color: '#374151', marginBottom: 5 }]}>
                          • {hobby}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    ),

    // Template 3: Elegant Professional (New Beautiful Template)
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
        {/* Elegant Header with subtle gradient */}
        <View style={[styles.elegantHeader, { 
          backgroundColor: '#6366f1',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
          padding: 35,
          position: 'relative'
        }]}>
          <View style={styles.elegantPattern}>
            <View style={[styles.elegantShape, { backgroundColor: '#ffffff', opacity: 0.08 }]} />
            <View style={[styles.elegantShape, { backgroundColor: '#ffffff', opacity: 0.04, top: 25, right: 30 }]} />
          </View>
          
          <View style={styles.elegantProfile}>
            <View style={styles.elegantImageContainer}>
              <MaterialIcons name="person-outline" size={70} color="#ffffff" />
            </View>
            <View style={styles.elegantInfo}>
              <Text style={[styles.name, { fontSize: 34, color: '#ffffff', fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 }]}>
                {data?.name}
              </Text>
              <Text style={[styles.role, { fontSize: 18, color: '#e0e7ff', fontWeight: '500', marginBottom: 20 }]}>
                {data?.branch}
              </Text>
              
              {/* Contact Information in elegant layout */}
              <View style={styles.elegantContactGrid}>
                <View style={styles.elegantContactItem}>
                  <MaterialIcons name="email" size={16} color="#e0e7ff" />
                  <Text style={styles.elegantContactText}>{data?.email}</Text>
                </View>
                <View style={styles.elegantContactItem}>
                  <MaterialIcons name="phone" size={16} color="#e0e7ff" />
                  <Text style={styles.elegantContactText}>{data?.phone}</Text>
                </View>
                <View style={styles.elegantContactItem}>
                  <MaterialIcons name="language" size={16} color="#e0e7ff" />
                  <Text style={styles.elegantContactText}>{data?.linkedin_url}</Text>
                </View>
                {data?.github_url && (
                  <View style={styles.elegantContactItem}>
                    <MaterialIcons name="code" size={16} color="#e0e7ff" />
                    <Text style={styles.elegantContactText}>{data?.github_url}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Content Area with elegant spacing */}
        <View style={[styles.elegantContent, { padding: 35 }]}>
          {/* Professional Summary */}
          <View style={[styles.section, { marginBottom: 35 }]}>
            <View style={styles.elegantSectionHeader}>
              <View style={styles.elegantSectionLine} />
              <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 18, fontWeight: '600', letterSpacing: 0.5 }]}>
                PROFESSIONAL SUMMARY
              </Text>
            </View>
            <Text style={[styles.sectionContent, { fontSize: 15, lineHeight: 26, color: '#374151', fontWeight: '400', textAlign: 'justify' }]}>
              {data?.objective}
            </Text>
          </View>

          {/* Skills with elegant badges */}
          <View style={[styles.section, { marginBottom: 35 }]}>
            <View style={styles.elegantSectionHeader}>
              <View style={styles.elegantSectionLine} />
              <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 18, fontWeight: '600' }]}>
                CORE SKILLS
              </Text>
            </View>
            <View style={styles.elegantSkillsContainer}>
              {(data?.skills || []).slice(0, 18).map((skill, i) => (
                <View key={i} style={styles.elegantSkillBadge}>
                  <Text style={styles.elegantSkillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Professional Experience */}
          <View style={[styles.section, { marginBottom: 35 }]}>
            <View style={styles.elegantSectionHeader}>
              <View style={styles.elegantSectionLine} />
              <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 18, fontWeight: '600' }]}>
                PROFESSIONAL EXPERIENCE
              </Text>
            </View>
            {(data?.work_experience || []).map((exp, i) => (
              <View key={i} style={[styles.itemContainer, { marginBottom: 28, paddingLeft: 25, borderLeft: '2px solid #e5e7eb', position: 'relative' }]}>
                <View style={[styles.elegantTimeline, { backgroundColor: '#6366f1' }]} />
                <Text style={[styles.itemTitle, { color: '#6366f1', fontSize: 17, fontWeight: '700', marginBottom: 5 }]}>
                  {exp.role}
                </Text>
                <Text style={[styles.itemSubtitle, { color: '#8b5cf6', fontSize: 15, fontWeight: '600', marginBottom: 8 }]}>
                  {exp.company} | {exp.duration}
                </Text>
                <Text style={[styles.itemDetail, { lineHeight: 24, fontSize: 14, color: '#374151', textAlign: 'justify' }]}>
                  {exp.description}
                </Text>
              </View>
            ))}
          </View>

          {/* Two Column Layout for Education and Projects */}
          <View style={styles.elegantTwoColumn}>
            {/* Left Column - Education */}
            <View style={[styles.column, { width: '50%', paddingRight: 20 }]}>
              <View style={styles.section}>
                <View style={styles.elegantSectionHeader}>
                  <View style={styles.elegantSectionLine} />
                  <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 16, fontWeight: '600' }]}>
                    EDUCATION
                  </Text>
                </View>
                {(data?.education || []).map((edu, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 20, paddingLeft: 15, borderLeft: '2px solid #f3f4f6' }]}>
                    <Text style={[styles.itemTitle, { color: '#6366f1', fontSize: 15, fontWeight: '700' }]}>
                      {edu.degree}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: '#8b5cf6', fontSize: 13, fontWeight: '600' }]}>
                      {edu.institute}
                    </Text>
                    <Text style={[styles.itemDetail, { fontSize: 13, color: '#6b7280' }]}>
                      {edu.field} | {edu.year}
                    </Text>
                    {edu.grade && (
                      <Text style={[styles.itemDetail, { fontSize: 12, color: '#6b7280', fontWeight: '500' }]}>
                        Grade: {edu.grade}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Right Column - Projects */}
            <View style={[styles.column, { width: '50%', paddingLeft: 20 }]}>
              <View style={styles.section}>
                <View style={styles.elegantSectionHeader}>
                  <View style={styles.elegantSectionLine} />
                  <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 16, fontWeight: '600' }]}>
                    KEY PROJECTS
                  </Text>
                </View>
                {(data?.projects || []).map((proj, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 18, paddingLeft: 15, borderLeft: '2px solid #f3f4f6' }]}>
                    <Text style={[styles.itemTitle, { color: '#6366f1', fontSize: 14, fontWeight: '700' }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 5, lineHeight: 20, fontSize: 13, textAlign: 'justify' }]}>
                      {proj.description}
                    </Text>
                    {proj.technologies && (
                      <Text style={[styles.itemLink, { color: '#8b5cf6', fontWeight: '600', marginTop: 5, fontSize: 12 }]}>
                        Tech Stack: {proj.technologies}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Additional Information in Three Columns */}
          {((data?.certifications && data.certifications.length > 0) || 
            (data?.achievements && data.achievements.length > 0) || 
            (data?.languages && data.languages.length > 0)) && (
            <View style={styles.elegantThreeColumn}>
              {/* Certifications */}
              {data?.certifications && data.certifications.length > 0 && (
                <View style={[styles.column, { width: '33%', paddingRight: 15 }]}>
                  <View style={styles.section}>
                    <View style={styles.elegantSectionHeader}>
                      <View style={styles.elegantSectionLine} />
                      <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 14, fontWeight: '600' }]}>
                        CERTIFICATIONS
                      </Text>
                    </View>
                    {data.certifications.map((cert, i) => (
                      <View key={i} style={[styles.itemContainer, { marginBottom: 12 }]}>
                        <Text style={[styles.itemTitle, { color: '#6366f1', fontSize: 12, fontWeight: '700' }]}>
                          {cert.name}
                        </Text>
                        <Text style={[styles.itemDetail, { fontSize: 10, color: '#6b7280' }]}>
                          {cert.organization}
                        </Text>
                        <Text style={[styles.itemDetail, { fontSize: 10, color: '#6b7280' }]}>
                          {cert.year}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Achievements */}
              {data?.achievements && data.achievements.length > 0 && (
                <View style={[styles.column, { width: '33%', paddingHorizontal: 10 }]}>
                  <View style={styles.section}>
                    <View style={styles.elegantSectionHeader}>
                      <View style={styles.elegantSectionLine} />
                      <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 14, fontWeight: '600' }]}>
                        ACHIEVEMENTS
                      </Text>
                    </View>
                    {data.achievements.map((achievement, i) => (
                      <View key={i} style={[styles.itemContainer, { marginBottom: 8 }]}>
                        <Text style={[styles.itemDetail, { fontSize: 11, color: '#374151', fontWeight: '500' }]}>
                          • {achievement}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Languages & Hobbies */}
              <View style={[styles.column, { width: '33%', paddingLeft: 15 }]}>
                {data?.languages && data.languages.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.elegantSectionHeader}>
                      <View style={styles.elegantSectionLine} />
                      <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 14, fontWeight: '600' }]}>
                        LANGUAGES
                      </Text>
                    </View>
                    <View style={styles.languageContainer}>
                      {data.languages.map((lang, i) => (
                        <Text key={i} style={[styles.itemDetail, { fontSize: 12, color: '#374151', marginBottom: 4 }]}>
                          • {lang}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}

                {data?.hobbies && data.hobbies.length > 0 && (
                  <View style={[styles.section, { marginTop: 20 }]}>
                    <View style={styles.elegantSectionHeader}>
                      <View style={styles.elegantSectionLine} />
                      <Text style={[styles.sectionTitle, { color: '#6366f1', fontSize: 14, fontWeight: '600' }]}>
                        INTERESTS
                      </Text>
                    </View>
                    <View style={styles.hobbiesContainer}>
                      {data.hobbies.map((hobby, i) => (
                        <Text key={i} style={[styles.itemDetail, { fontSize: 12, color: '#374151', marginBottom: 4 }]}>
                          â€¢ {hobby}
                        </Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      </View>
    ),

    // Template 4: Creative Half-Side Resume (Green Theme)
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
        <View style={styles.creativeContainer}>
          {/* Left Sidebar - Green Theme */}
          <View style={[styles.creativeSidebar, { 
            backgroundColor: '#059669',
            background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
            width: '35%',
            padding: 25
          }]}>
            {/* Profile Section */}
            <View style={styles.creativeProfile}>
              <View style={styles.creativeImageContainer}>
                <MaterialIcons name="account-circle" size={70} color="#ffffff" />
              </View>
              <Text style={[styles.name, { fontSize: 22, color: '#ffffff', fontWeight: '800', textAlign: 'center', marginBottom: 5 }]}>
                {data?.name}
              </Text>
              <Text style={[styles.role, { fontSize: 14, color: '#a7f3d0', fontWeight: '600', textAlign: 'center', marginBottom: 20 }]}>
                {data?.branch}
              </Text>
            </View>

            {/* Contact Information */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                CONTACT
              </Text>
              <View style={styles.creativeContactItem}>
                <MaterialIcons name="email" size={14} color="#a7f3d0" />
                <Text style={[styles.creativeContactText, { color: '#d1fae5', fontSize: 11 }]}>{data?.email}</Text>
              </View>
              <View style={styles.creativeContactItem}>
                <MaterialIcons name="phone" size={14} color="#a7f3d0" />
                <Text style={[styles.creativeContactText, { color: '#d1fae5', fontSize: 11 }]}>{data?.phone}</Text>
              </View>
              <View style={styles.creativeContactItem}>
                <MaterialIcons name="location-on" size={14} color="#a7f3d0" />
                <Text style={[styles.creativeContactText, { color: '#d1fae5', fontSize: 11 }]}>{data?.address}</Text>
              </View>
              <View style={styles.creativeContactItem}>
                <MaterialIcons name="link" size={14} color="#a7f3d0" />
                <Text style={[styles.creativeContactText, { color: '#d1fae5', fontSize: 11 }]}>{data?.linkedin_url}</Text>
              </View>
            </View>

            {/* Skills Section */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                SKILLS
              </Text>
              {(data?.skills || []).slice(0, 8).map((skill, i) => (
                <View key={i} style={[styles.creativeSkillItem, { marginBottom: 12 }]}>
                  <Text style={[styles.creativeSkillName, { color: '#d1fae5', fontSize: 12, marginBottom: 4 }]}>{skill}</Text>
                  <View style={styles.creativeProgressBar}>
                    <View style={[styles.creativeProgressFill, { width: `${85 + (i % 3) * 5}%`, backgroundColor: '#34d399' }]} />
                  </View>
                </View>
              ))}
            </View>

            {/* Languages */}
            {data?.languages && data.languages.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                  LANGUAGES
                </Text>
                {data.languages.map((lang, i) => (
                  <Text key={i} style={[styles.creativeLanguageItem, { color: '#d1fae5', fontSize: 12, marginBottom: 6 }]}>
                    • {lang}
                  </Text>
                ))}
              </View>
            )}
          </View>

          {/* Right Content Area */}
          <View style={[styles.creativeContent, { width: '65%', padding: 25 }]}>
            {/* Professional Summary */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.creativeSectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#059669', fontSize: 16, fontWeight: '700', marginBottom: 10 }]}>
                  PROFESSIONAL SUMMARY
                </Text>
                <View style={[styles.creativeSectionLine, { backgroundColor: '#059669' }]} />
              </View>
              <Text style={[styles.sectionContent, { fontSize: 13, lineHeight: 20, color: '#374151', textAlign: 'justify' }]}>
                {data?.objective}
              </Text>
            </View>

            {/* Work Experience */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.creativeSectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#059669', fontSize: 16, fontWeight: '700', marginBottom: 10 }]}>
                  WORK EXPERIENCE
                </Text>
                <View style={[styles.creativeSectionLine, { backgroundColor: '#059669' }]} />
              </View>
              {(data?.work_experience || []).map((exp, i) => (
                <View key={i} style={[styles.itemContainer, { marginBottom: 20, paddingLeft: 15, borderLeft: '3px solid #d1fae5' }]}>
                  <Text style={[styles.itemTitle, { color: '#059669', fontSize: 15, fontWeight: '700' }]}>
                    {exp.role}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 13, fontWeight: '600' }]}>
                    {exp.company} | {exp.duration}
                  </Text>
                  <Text style={[styles.itemDetail, { marginTop: 5, lineHeight: 18, fontSize: 12, color: '#374151' }]}>
                    {exp.description}
                  </Text>
                </View>
              ))}
            </View>

            {/* Education */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.creativeSectionHeader}>
                <Text style={[styles.sectionTitle, { color: '#059669', fontSize: 16, fontWeight: '700', marginBottom: 10 }]}>
                  EDUCATION
                </Text>
                <View style={[styles.creativeSectionLine, { backgroundColor: '#059669' }]} />
              </View>
              {(data?.education || []).map((edu, i) => (
                <View key={i} style={[styles.itemContainer, { marginBottom: 15 }]}>
                  <Text style={[styles.itemTitle, { color: '#059669', fontSize: 14, fontWeight: '700' }]}>
                    {edu.degree}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 12 }]}>
                    {edu.institute} | {edu.year}
                  </Text>
                  <Text style={[styles.itemDetail, { fontSize: 12, color: '#6b7280' }]}>
                    {edu.field} {edu.grade ? '• Grade: ' + edu.grade : ''}
                  </Text>
                </View>
              ))}
            </View>

            {/* Projects */}
            {data?.projects && data.projects.length > 0 && (
              <View style={[styles.section, { marginBottom: 25 }]}>
                <View style={styles.creativeSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#059669', fontSize: 16, fontWeight: '700', marginBottom: 10 }]}>
                    KEY PROJECTS
                  </Text>
                  <View style={[styles.creativeSectionLine, { backgroundColor: '#059669' }]} />
                </View>
                {data.projects.map((proj, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 15 }]}>
                    <Text style={[styles.itemTitle, { color: '#059669', fontSize: 13, fontWeight: '700' }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 3, lineHeight: 16, fontSize: 11, color: '#374151' }]}>
                      {proj.description}
                    </Text>
                    {proj.technologies && (
                      <Text style={[styles.itemLink, { color: '#10b981', fontWeight: '600', marginTop: 3, fontSize: 10 }]}>
                        Tech: {proj.technologies}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* Certifications */}
            {data?.certifications && data.certifications.length > 0 && (
              <View style={styles.section}>
                <View style={styles.creativeSectionHeader}>
                  <Text style={[styles.sectionTitle, { color: '#059669', fontSize: 16, fontWeight: '700', marginBottom: 10 }]}>
                    CERTIFICATIONS
                  </Text>
                  <View style={[styles.creativeSectionLine, { backgroundColor: '#059669' }]} />
                </View>
                {data.certifications.map((cert, i) => (
                  <View key={i} style={[styles.itemContainer, { marginBottom: 10 }]}>
                    <Text style={[styles.itemTitle, { color: '#059669', fontSize: 12, fontWeight: '700' }]}>
                      {cert.name}
                    </Text>
                    <Text style={[styles.itemDetail, { fontSize: 10, color: '#6b7280' }]}>
                      {cert.organization} • {cert.year}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    ),

    // Template 5: Modern Half-Side Resume (Orange Theme)
    (data) => (
      <View style={[styles.resumeCard, { backgroundColor: '#ffffff', padding: 0, overflow: 'hidden' }]}>
        <View style={styles.modernContainer}>
          {/* Right Sidebar - Orange Theme */}
          <View style={[styles.modernContent, { width: '65%', padding: 25 }]}>
            {/* Header */}
            <View style={[styles.modernHeader, { marginBottom: 25 }]}>
              <Text style={[styles.name, { fontSize: 28, color: '#ea580c', fontWeight: '800', marginBottom: 5 }]}>
                {data?.name}
              </Text>
              <Text style={[styles.role, { fontSize: 16, color: '#6b7280', fontWeight: '600', marginBottom: 15 }]}>
                {data?.branch}
              </Text>
              <View style={[styles.modernHeaderLine, { backgroundColor: '#ea580c' }]} />
            </View>

            {/* Professional Summary */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.modernSectionHeader}>
                <MaterialIcons name="person" size={18} color="#ea580c" />
                <Text style={[styles.sectionTitle, { color: '#ea580c', fontSize: 16, fontWeight: '700', marginLeft: 8 }]}>
                  PROFESSIONAL SUMMARY
                </Text>
              </View>
              <Text style={[styles.sectionContent, { fontSize: 13, lineHeight: 20, color: '#374151', textAlign: 'justify', marginTop: 10 }]}>
                {data?.objective}
              </Text>
            </View>

            {/* Work Experience */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.modernSectionHeader}>
                <MaterialIcons name="work" size={18} color="#ea580c" />
                <Text style={[styles.sectionTitle, { color: '#ea580c', fontSize: 16, fontWeight: '700', marginLeft: 8 }]}>
                  WORK EXPERIENCE
                </Text>
              </View>
              {(data?.work_experience || []).map((exp, i) => (
                <View key={i} style={[styles.itemContainer, { marginTop: 15, marginBottom: 20, paddingLeft: 20, borderLeft: '3px solid #fed7aa', position: 'relative' }]}>
                  <View style={[styles.modernTimeline, { backgroundColor: '#ea580c' }]} />
                  <Text style={[styles.itemTitle, { color: '#ea580c', fontSize: 15, fontWeight: '700' }]}>
                    {exp.role}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: '#f97316', fontSize: 13, fontWeight: '600' }]}>
                    {exp.company} | {exp.duration}
                  </Text>
                  <Text style={[styles.itemDetail, { marginTop: 5, lineHeight: 18, fontSize: 12, color: '#374151' }]}>
                    {exp.description}
                  </Text>
                </View>
              ))}
            </View>

            {/* Education */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <View style={styles.modernSectionHeader}>
                <MaterialIcons name="school" size={18} color="#ea580c" />
                <Text style={[styles.sectionTitle, { color: '#ea580c', fontSize: 16, fontWeight: '700', marginLeft: 8 }]}>
                  EDUCATION
                </Text>
              </View>
              {(data?.education || []).map((edu, i) => (
                <View key={i} style={[styles.itemContainer, { marginTop: 15, marginBottom: 15 }]}>
                  <Text style={[styles.itemTitle, { color: '#ea580c', fontSize: 14, fontWeight: '700' }]}>
                    {edu.degree}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: '#6b7280', fontSize: 12 }]}>
                    {edu.institute} | {edu.year}
                  </Text>
                  <Text style={[styles.itemDetail, { fontSize: 12, color: '#6b7280' }]}>
                    {edu.field} {edu.grade ? '• Grade: ' + edu.grade : ''}
                  </Text>
                </View>
              ))}
            </View>

            {/* Projects */}
            {data?.projects && data.projects.length > 0 && (
              <View style={styles.section}>
                <View style={styles.modernSectionHeader}>
                  <MaterialIcons name="code" size={18} color="#ea580c" />
                  <Text style={[styles.sectionTitle, { color: '#ea580c', fontSize: 16, fontWeight: '700', marginLeft: 8 }]}>
                    KEY PROJECTS
                  </Text>
                </View>
                {data.projects.map((proj, i) => (
                  <View key={i} style={[styles.itemContainer, { marginTop: 15, marginBottom: 15 }]}>
                    <Text style={[styles.itemTitle, { color: '#ea580c', fontSize: 13, fontWeight: '700' }]}>
                      {proj.title}
                    </Text>
                    <Text style={[styles.itemDetail, { marginTop: 3, lineHeight: 16, fontSize: 11, color: '#374151' }]}>
                      {proj.description}
                    </Text>
                    {proj.technologies && (
                      <Text style={[styles.itemLink, { color: '#f97316', fontWeight: '600', marginTop: 3, fontSize: 10 }]}>
                        Technologies: {proj.technologies}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Left Sidebar - Orange Theme */}
          <View style={[styles.modernSidebar, { 
            backgroundColor: '#ea580c',
            background: 'linear-gradient(135deg, #ea580c 0%, #f97316 50%, #fb923c 100%)',
            width: '35%',
            padding: 25
          }]}>
            {/* Profile Section */}
            <View style={styles.modernProfile}>
              <View style={styles.modernImageContainer}>
                <MaterialIcons name="person" size={60} color="#ffffff" />
              </View>
            </View>

            {/* Contact Information */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                CONTACT INFO
              </Text>
              <View style={styles.modernContactItem}>
                <MaterialIcons name="email" size={14} color="#fed7aa" />
                <Text style={[styles.modernContactText, { color: '#fef3e2', fontSize: 11 }]}>{data?.email}</Text>
              </View>
              <View style={styles.modernContactItem}>
                <MaterialIcons name="phone" size={14} color="#fed7aa" />
                <Text style={[styles.modernContactText, { color: '#fef3e2', fontSize: 11 }]}>{data?.phone}</Text>
              </View>
              <View style={styles.modernContactItem}>
                <MaterialIcons name="location-on" size={14} color="#fed7aa" />
                <Text style={[styles.modernContactText, { color: '#fef3e2', fontSize: 11 }]}>{data?.address}</Text>
              </View>
              <View style={styles.modernContactItem}>
                <MaterialIcons name="link" size={14} color="#fed7aa" />
                <Text style={[styles.modernContactText, { color: '#fef3e2', fontSize: 11 }]}>{data?.linkedin_url}</Text>
              </View>
              {data?.github_url && (
                <View style={styles.modernContactItem}>
                  <MaterialIcons name="code" size={14} color="#fed7aa" />
                  <Text style={[styles.modernContactText, { color: '#fef3e2', fontSize: 11 }]}>{data?.github_url}</Text>
                </View>
              )}
            </View>

            {/* Skills Section */}
            <View style={[styles.section, { marginBottom: 25 }]}>
              <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                CORE SKILLS
              </Text>
              <View style={styles.modernSkillsContainer}>
                {(data?.skills || []).slice(0, 12).map((skill, i) => (
                  <View key={i} style={styles.modernSkillBadge}>
                    <Text style={styles.modernSkillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Languages */}
            {data?.languages && data.languages.length > 0 && (
              <View style={[styles.section, { marginBottom: 25 }]}>
                <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                  LANGUAGES
                </Text>
                {data.languages.map((lang, i) => (
                  <View key={i} style={styles.modernLanguageItem}>
                    <Text style={[styles.modernLanguageText, { color: '#fef3e2', fontSize: 12 }]}>{lang}</Text>
                    <View style={styles.modernLanguageLevel}>
                      {[...Array(5)].map((_, j) => (
                        <View 
                          key={j} 
                          style={[
                            styles.modernLevelDot, 
                            { backgroundColor: j < (4 + (i % 2)) ? '#fed7aa' : 'rgba(255,255,255,0.3)' }
                          ]} 
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Certifications */}
            {data?.certifications && data.certifications.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: '#ffffff', fontSize: 14, fontWeight: '700', marginBottom: 15, letterSpacing: 1 }]}>
                  CERTIFICATIONS
                </Text>
                {data.certifications.map((cert, i) => (
                  <View key={i} style={styles.modernCertItem}>
                    <MaterialIcons name="verified" size={12} color="#fed7aa" />
                    <View style={styles.modernCertText}>
                      <Text style={[styles.modernCertName, { color: '#fef3e2', fontSize: 11, fontWeight: '600' }]}>
                        {cert.name}
                      </Text>
                      <Text style={[styles.modernCertOrg, { color: '#fed7aa', fontSize: 9 }]}>
                        {cert.organization} • {cert.year}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    ),
  ];

  const getTemplateHTML = (idx, data) => {
    const safeData = {
      ...data,
      name: data?.name || 'Your Name',
      email: data?.email || 'email@example.com',
      branch: data?.branch || 'Professional Title',
      phone: data?.phone || '+1 234 567 8900',
      linkedin_url: data?.linkedin_url || 'linkedin.com/in/yourprofile',
      objective: data?.objective || 'A dedicated professional with a passion for learning and growth.',
      skills: data?.skills || [],
      education: data?.education || [],
      work_experience: data?.work_experience || [],
      projects: data?.projects || [],
      certifications: data?.certifications || [],
      languages: data?.languages || [],
    };

    if (idx === 0) {
      // Modern Tech Resume
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: Helvetica, Arial, sans-serif; 
                margin: 0; 
                background: #ffffff; 
                line-height: 1.5; 
                width: 210mm;
                min-height: 297mm;
              }
              .container { 
                width: 100%; 
                min-height: 100vh; 
                border-left: 5px solid #0284c7; 
                padding: 25px; 
                box-shadow: none; 
              }
              .header { margin-bottom: 25px; }
              .name { font-size: 28px; color: #0c4a6e; font-weight: 700; }
              .role { font-size: 18px; color: #475569; font-weight: 600; margin-bottom: 10px; }
              .contact { font-size: 14px; color: #475569; }
              .section { margin: 25px 0; }
              .section-title { font-size: 18px; color: #0c4a6e; font-weight: 700; border-bottom: 2px solid #0284c7; padding-bottom: 5px; margin-bottom: 15px; }
              .item { margin-bottom: 20px; }
              .item-title { font-size: 16px; font-weight: 600; color: #0c4a6e; }
              .item-subtitle { font-size: 14px; color: #475569; font-style: italic; }
              .item-detail { font-size: 14px; color: #475569; margin-top: 5px; }
              .skills { display: flex; flex-wrap: wrap; gap: 10px; }
              .skill-badge { background: #e0f2fe; padding: 6px 12px; border-radius: 12px; font-size: 13px; color: #0c4a6e; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="name">${safeData.name}</div>
                <div class="role">${safeData.branch}</div>
                <div class="contact">${safeData.email} | ${safeData.phone} | ${safeData.linkedin_url}</div>
              </div>
              <div class="section">
                <div class="section-title">Professional Summary</div>
                <div class="item-detail">${safeData.objective}</div>
              </div>
              <div class="section">
                <div class="section-title">Work Experience</div>
                ${safeData.work_experience.map(exp => `
                  <div class="item">
                    <div class="item-title">${exp.role}</div>
                    <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                    <div class="item-detail">${exp.description}</div>
                  </div>
                `).join('')}
              </div>
              <div class="section">
                <div class="section-title">Education</div>
                ${safeData.education.map(edu => `
                  <div class="item">
                    <div class="item-title">${edu.degree}, ${edu.field}</div>
                    <div class="item-subtitle">${edu.institute} | ${edu.year}</div>
                    <div class="item-detail">${edu.grade ? `Grade: ${edu.grade}` : ''}</div>
                  </div>
                `).join('')}
              </div>
              <div class="section">
                <div class="section-title">Skills</div>
                <div class="skills">${safeData.skills.map(skill => `<span class="skill-badge">${skill}</span>`).join('')}</div>
              </div>
              <div class="section">
                <div class="section-title">Projects</div>
                ${safeData.projects.map(proj => `
                  <div class="item">
                    <div class="item-title">${proj.title}</div>
                    <div class="item-detail">${proj.description}</div>
                    <div class="item-detail">${proj.technologies ? `Technologies: ${proj.technologies}` : ''}</div>
                  </div>
                `).join('')}
              </div>
              <div class="section">
                <div class="section-title">Certifications</div>
                ${safeData.certifications.map(cert => `
                  <div class="item">
                    <div class="item-detail">${cert.name} | ${cert.organization} | ${cert.year}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 1) {
      // Advanced Half-Shaded Professional (Left sidebar)
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: Helvetica, Arial, sans-serif; 
                margin: 0; 
                background: #ffffff; 
                line-height: 1.5; 
                width: 210mm;
                min-height: 297mm;
              }
              .container { 
                width: 100%; 
                min-height: 100vh; 
                display: flex; 
                box-shadow: none; 
                border-radius: 0; 
                overflow: hidden; 
              }
              .sidebar { width: 38%; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 25px; color: #ffffff; }
              .content { width: 62%; padding: 25px; background: #ffffff; }
              .profile-section { text-align: center; margin-bottom: 30px; }
              .profile-image { width: 80px; height: 80px; background: #475569; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 40px; }
              .name { font-size: 24px; color: #ffffff; font-weight: 700; margin-bottom: 5px; }
              .role { font-size: 16px; color: #94a3b8; font-weight: 600; }
              .sidebar-section { margin-bottom: 25px; }
              .sidebar-title { font-size: 14px; color: #ffffff; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px; }
              .contact-item { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; color: #cbd5e1; }
              .contact-icon { margin-right: 8px; }
              .skill-item { margin-bottom: 12px; }
              .skill-name { font-size: 13px; color: #cbd5e1; margin-bottom: 4px; }
              .progress-bar { height: 4px; background: #475569; border-radius: 2px; overflow: hidden; }
              .progress-fill { height: 100%; background: #60a5fa; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; color: #1e293b; font-weight: 700; border-bottom: 2px solid #1e293b; padding-bottom: 5px; margin-bottom: 15px; }
              .item { margin-bottom: 20px; }
              .item-title { font-size: 16px; font-weight: 600; color: #1e293b; }
              .item-subtitle { font-size: 14px; color: #64748b; font-style: italic; }
              .item-detail { font-size: 14px; color: #475569; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="sidebar">
                <div class="profile-section">
                  <div class="profile-image">ðŸ‘¤</div>
                  <div class="name">${safeData.name}</div>
                  <div class="role">${safeData.branch}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CONTACT</div>
                  <div class="contact-item">ðŸ“§ ${safeData.email}</div>
                  <div class="contact-item">ðŸ“± ${safeData.phone}</div>
                  <div class="contact-item">ðŸ”— ${safeData.linkedin_url}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">SKILLS</div>
                  ${safeData.skills.slice(0, 8).map((skill, i) => `
                    <div class="skill-item">
                      <div class="skill-name">${skill}</div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${85 + (i % 3) * 5}%"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">LANGUAGES</div>
                  ${safeData.languages.map(lang => `<div class="contact-item">â€¢ ${lang}</div>`).join('')}
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-title">PROFESSIONAL SUMMARY</div>
                  <div class="item-detail">${safeData.objective}</div>
                </div>
                <div class="section">
                  <div class="section-title">WORK EXPERIENCE</div>
                  ${safeData.work_experience.map(exp => `
                    <div class="item">
                      <div class="item-title">${exp.role}</div>
                      <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                      <div class="item-detail">${exp.description}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">EDUCATION</div>
                  ${safeData.education.map(edu => `
                    <div class="item">
                      <div class="item-title">${edu.degree}, ${edu.field}</div>
                      <div class="item-subtitle">${edu.institute} | ${edu.year}</div>
                      <div class="item-detail">${edu.grade ? `Grade: ${edu.grade}` : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">PROJECTS</div>
                  ${safeData.projects.map(proj => `
                    <div class="item">
                      <div class="item-title">${proj.title}</div>
                      <div class="item-detail">${proj.description}</div>
                      <div class="item-detail">${proj.technologies ? `Technologies: ${proj.technologies}` : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">CERTIFICATIONS</div>
                  ${safeData.certifications.map(cert => `
                    <div class="item">
                      <div class="item-detail">${cert.name} | ${cert.organization} | ${cert.year}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 2) {
      // Advanced Half-Shaded Creative (Right sidebar)
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: Helvetica, Arial, sans-serif; 
                margin: 0; 
                background: #ffffff; 
                line-height: 1.5; 
                width: 210mm;
                min-height: 297mm;
              }
              .container { 
                width: 100%; 
                min-height: 100vh; 
                display: flex; 
                box-shadow: none; 
                border-radius: 0; 
                overflow: hidden; 
              }
              .content { width: 62%; padding: 25px; background: #ffffff; }
              .sidebar { width: 38%; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 25px; border-left: 4px solid #7c3aed; }
              .header { margin-bottom: 25px; }
              .name { font-size: 32px; color: #7c3aed; font-weight: 800; margin-bottom: 5px; }
              .role { font-size: 18px; color: #6b7280; font-weight: 600; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; color: #7c3aed; font-weight: 700; border-bottom: 2px solid #7c3aed; padding-bottom: 5px; margin-bottom: 15px; }
              .item { margin-bottom: 20px; }
              .item-title { font-size: 16px; font-weight: 600; color: #7c3aed; }
              .item-subtitle { font-size: 14px; color: #6b7280; font-style: italic; }
              .item-detail { font-size: 14px; color: #475569; margin-top: 5px; }
              .profile-section { text-align: center; margin-bottom: 25px; }
              .profile-image { margin-bottom: 15px; }
              .avatar-circle { width: 80px; height: 80px; background: #7c3aed; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; border: 3px solid #a855f7; }
              .avatar-initials { font-size: 28px; color: white; font-weight: 700; }
              .profile-name { color: #7c3aed; font-size: 18px; font-weight: 700; margin-bottom: 5px; }
              .profile-title { color: #6b7280; font-size: 14px; font-weight: 500; }
              .sidebar-section { margin-bottom: 25px; }
              .sidebar-title { font-size: 14px; color: #7c3aed; font-weight: 700; margin-bottom: 12px; letter-spacing: 1px; }
              .contact-item { display: flex; align-items: center; margin-bottom: 8px; font-size: 13px; color: #374151; }
              .skill-item { display: flex; justify-content: between; align-items: center; margin-bottom: 8px; }
              .skill-name { font-size: 13px; color: #374151; font-weight: 600; }
              .skill-rating { display: flex; gap: 2px; }
              .star { color: #7c3aed; font-size: 12px; }
              .star-empty { color: #d1d5db; font-size: 12px; }
              .language-item { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
              .language-level { display: flex; gap: 3px; }
              .level-dot { width: 8px; height: 8px; border-radius: 50%; }
              .cert-item { display: flex; align-items: flex-start; margin-bottom: 12px; }
              .cert-icon { margin-right: 8px; color: #7c3aed; }
              .cert-text { font-size: 12px; color: #374151; }
              .cert-org { font-size: 11px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="content">
                <div class="header">
                  <div class="name">${safeData.name}</div>
                  <div class="role">${safeData.branch}</div>
                </div>
                <div class="section">
                  <div class="section-title">PROFESSIONAL SUMMARY</div>
                  <div class="item-detail">${safeData.objective}</div>
                </div>
                <div class="section">
                  <div class="section-title">WORK EXPERIENCE</div>
                  ${safeData.work_experience.map(exp => `
                    <div class="item">
                      <div class="item-title">${exp.role}</div>
                      <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                      <div class="item-detail">${exp.description}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">EDUCATION</div>
                  ${safeData.education.map(edu => `
                    <div class="item">
                      <div class="item-title">${edu.degree}, ${edu.field}</div>
                      <div class="item-subtitle">${edu.institute} | ${edu.year}</div>
                      <div class="item-detail">${edu.grade ? `Grade: ${edu.grade}` : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">PROJECTS</div>
                  ${safeData.projects.map(proj => `
                    <div class="item">
                      <div class="item-title">${proj.title}</div>
                      <div class="item-detail">${proj.description}</div>
                      <div class="item-detail">${proj.technologies ? `Technologies: ${proj.technologies}` : ''}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
              <div class="sidebar">
                <div class="profile-section">
                  <div class="profile-image">ðŸ‘¤</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CONTACT INFO</div>
                  <div class="contact-item">ðŸ“§ ${safeData.email}</div>
                  <div class="contact-item">ðŸ“± ${safeData.phone}</div>
                  <div class="contact-item">ðŸ”— ${safeData.linkedin_url}</div>
                  <div class="contact-item">ðŸ’» ${safeData.github_url}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CORE SKILLS</div>
                  ${safeData.skills.slice(0, 8).map((skill, i) => `
                    <div class="skill-item">
                      <div class="skill-name">${skill}</div>
                      <div class="skill-rating">
                        ${'â˜…'.repeat(4 + (i % 2))}${'â˜†'.repeat(5 - (4 + (i % 2)))}
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">LANGUAGES</div>
                  ${safeData.languages.map((lang, i) => `
                    <div class="language-item">
                      <div class="skill-name">${lang}</div>
                      <div class="language-level">
                        <div class="level-dot" style="background: #7c3aed;"></div>
                        <div class="level-dot" style="background: #7c3aed;"></div>
                        <div class="level-dot" style="background: #7c3aed;"></div>
                        <div class="level-dot" style="background: ${i % 2 === 0 ? '#7c3aed' : '#d1d5db'};"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CERTIFICATIONS</div>
                  ${safeData.certifications.map(cert => `
                    <div class="cert-item">
                      <div class="cert-icon">âœ“</div>
                      <div>
                        <div class="cert-text">${cert.name}</div>
                        <div class="cert-org">${cert.organization} â€¢ ${cert.year}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 3) {
      // Creative Half-Side Resume (Green Theme)
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                background: #ffffff; 
                line-height: 1.6; 
                color: #374151;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
              }
              .container { 
                width: 100%; 
                min-height: 100vh;
                display: flex;
              }
              .sidebar { 
                width: 35%; 
                background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); 
                padding: 25px; 
                color: #ffffff;
              }
              .content { 
                width: 65%; 
                padding: 25px; 
                background: #ffffff;
              }
              .profile-section { 
                text-align: center; 
                margin-bottom: 25px; 
              }
              .profile-image { 
                width: 70px; 
                height: 70px; 
                background: rgba(255,255,255,0.2); 
                border-radius: 50%; 
                margin: 0 auto 15px; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 24px; 
                color: #ffffff;
                border: 2px solid rgba(255,255,255,0.3);
                font-weight: 700;
              }
              .name { 
                font-size: 22px; 
                color: #ffffff; 
                font-weight: 800; 
                text-align: center; 
                margin-bottom: 5px; 
              }
              .role { 
                font-size: 14px; 
                color: #a7f3d0; 
                font-weight: 600; 
                text-align: center; 
                margin-bottom: 20px; 
              }
              .sidebar-section { 
                margin-bottom: 25px; 
              }
              .sidebar-title { 
                font-size: 14px; 
                color: #ffffff; 
                font-weight: 700; 
                margin-bottom: 15px; 
                letter-spacing: 1px; 
              }
              .contact-item { 
                display: flex; 
                align-items: center; 
                margin-bottom: 8px; 
                font-size: 11px; 
                color: #d1fae5; 
              }
              .contact-icon { 
                margin-right: 8px; 
                color: #a7f3d0; 
              }
              .skill-item { 
                margin-bottom: 12px; 
              }
              .skill-name { 
                color: #d1fae5; 
                font-size: 12px; 
                margin-bottom: 4px; 
              }
              .progress-bar { 
                height: 4px; 
                background: rgba(255,255,255,0.3); 
                border-radius: 2px; 
                overflow: hidden; 
              }
              .progress-fill { 
                height: 100%; 
                background: #34d399; 
              }
              .language-item { 
                color: #d1fae5; 
                font-size: 12px; 
                margin-bottom: 6px; 
              }
              .section { 
                margin-bottom: 25px; 
              }
              .section-header { 
                margin-bottom: 10px; 
              }
              .section-title { 
                color: #059669; 
                font-size: 16px; 
                font-weight: 700; 
                margin-bottom: 10px; 
              }
              .section-line { 
                height: 2px; 
                background: #059669; 
                width: 50px; 
                margin-bottom: 15px; 
              }
              .item { 
                margin-bottom: 20px; 
                padding-left: 15px; 
                border-left: 3px solid #d1fae5; 
              }
              .item-title { 
                color: #059669; 
                font-size: 15px; 
                font-weight: 700; 
              }
              .item-subtitle { 
                color: #6b7280; 
                font-size: 13px; 
                font-weight: 600; 
              }
              .item-detail { 
                margin-top: 5px; 
                line-height: 18px; 
                font-size: 12px; 
                color: #374151; 
              }
              .item-link { 
                color: #10b981; 
                font-weight: 600; 
                margin-top: 3px; 
                font-size: 10px; 
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="sidebar">
                <div class="profile-section">
                  <div class="profile-image">${safeData.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                  <div class="name">${safeData.name}</div>
                  <div class="role">${safeData.branch}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CONTACT</div>
                  <div class="contact-item">
                    <div class="contact-icon">📧</div>
                    <div>${safeData.email}</div>
                  </div>
                  <div class="contact-item">
                    <div class="contact-icon">📱</div>
                    <div>${safeData.phone}</div>
                  </div>
                  <div class="contact-item">
                    <div class="contact-icon">📍</div>
                    <div>${safeData.address || 'Address'}</div>
                  </div>
                  <div class="contact-item">
                    <div class="contact-icon">🔗</div>
                    <div>${safeData.linkedin_url}</div>
                  </div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">SKILLS</div>
                  ${safeData.skills.slice(0, 8).map((skill, i) => `
                    <div class="skill-item">
                      <div class="skill-name">${skill}</div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${85 + (i % 3) * 5}%"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">LANGUAGES</div>
                  ${safeData.languages.map(lang => `
                    <div class="language-item">• ${lang}</div>
                  `).join('')}
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">PROFESSIONAL SUMMARY</div>
                    <div class="section-line"></div>
                  </div>
                  <div class="item-detail">${safeData.objective}</div>
                </div>
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">WORK EXPERIENCE</div>
                    <div class="section-line"></div>
                  </div>
                  ${safeData.work_experience.map(exp => `
                    <div class="item">
                      <div class="item-title">${exp.role}</div>
                      <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                      <div class="item-detail">${exp.description}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">EDUCATION</div>
                    <div class="section-line"></div>
                  </div>
                  ${safeData.education.map(edu => `
                    <div class="item">
                      <div class="item-title">${edu.degree}</div>
                      <div class="item-subtitle">${edu.institute} | ${edu.year}</div>
                      <div class="item-detail">${edu.field} ${edu.grade ? '• Grade: ' + edu.grade : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">KEY PROJECTS</div>
                    <div class="section-line"></div>
                  </div>
                  ${safeData.projects.map(proj => `
                    <div class="item">
                      <div class="item-title">${proj.title}</div>
                      <div class="item-detail">${proj.description}</div>
                      <div class="item-link">${proj.technologies ? 'Tech: ' + proj.technologies : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-header">
                    <div class="section-title">CERTIFICATIONS</div>
                    <div class="section-line"></div>
                  </div>
                  ${safeData.certifications.map(cert => `
                    <div class="item">
                      <div class="item-title">${cert.name}</div>
                      <div class="item-detail">${cert.organization} • ${cert.year}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 4) {
      // Modern Half-Side Resume (Orange Theme)
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                background: #ffffff; 
                line-height: 1.6; 
                color: #333;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
              }
              .container { 
                width: 100%; 
                min-height: 100vh;
                display: flex;
                flex-direction: column;
              }
              .header { 
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%); 
                color: white; 
                padding: 40px 30px; 
                position: relative;
                overflow: hidden;
              }
              .header::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -20%;
                width: 200px;
                height: 200px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 50%;
              }
              .header::after {
                content: '';
                position: absolute;
                bottom: -30%;
                left: -10%;
                width: 150px;
                height: 150px;
                background: rgba(6, 182, 212, 0.1);
                border-radius: 50%;
              }
              .profile { 
                display: flex; 
                align-items: center; 
                gap: 25px; 
                position: relative;
                z-index: 1;
              }
              .profile-image { 
                width: 80px; 
                height: 80px; 
                background: rgba(255,255,255,0.2); 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 40px; 
                border: 3px solid rgba(255,255,255,0.3);
              }
              .profile-info h1 { 
                font-size: 36px; 
                font-weight: 800; 
                margin-bottom: 8px; 
                letter-spacing: 1px;
              }
              .profile-info .title { 
                font-size: 20px; 
                color: #94a3b8; 
                font-weight: 600; 
                margin-bottom: 20px; 
              }
              .contact-row { 
                display: flex; 
                gap: 30px; 
                flex-wrap: wrap;
              }
              .contact-item { 
                display: flex; 
                align-items: center; 
                gap: 8px; 
                font-size: 14px; 
                color: #cbd5e1;
              }
              .content { 
                padding: 40px 30px; 
                flex: 1;
              }
              .section { 
                margin-bottom: 35px; 
              }
              .section-header {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
              }
              .section-accent {
                width: 4px;
                height: 24px;
                background: linear-gradient(135deg, #3b82f6, #06b6d4);
                margin-right: 15px;
                border-radius: 2px;
              }
              .section-title { 
                font-size: 18px; 
                font-weight: 700; 
                color: #0f172a; 
                letter-spacing: 1px;
              }
              .two-column { 
                display: flex; 
                gap: 30px; 
              }
              .left-column { 
                flex: 2; 
              }
              .right-column { 
                flex: 1; 
              }
              .item { 
                margin-bottom: 25px; 
                padding-bottom: 20px;
                border-bottom: 1px solid #f3f4f6;
              }
              .item:last-child {
                border-bottom: none;
              }
              .item-title { 
                font-size: 17px; 
                font-weight: 700; 
                color: #0f172a; 
                margin-bottom: 5px;
              }
              .item-subtitle { 
                font-size: 15px; 
                color: #3b82f6; 
                font-weight: 600; 
                margin-bottom: 10px;
              }
              .item-detail { 
                font-size: 14px; 
                color: #4b5563; 
                line-height: 1.6;
              }
              .skills-grid { 
                display: grid; 
                grid-template-columns: repeat(2, 1fr); 
                gap: 8px; 
              }
              .skill-badge { 
                background: linear-gradient(135deg, #eff6ff, #dbeafe); 
                color: #1e40af; 
                padding: 8px 12px; 
                border-radius: 20px; 
                font-size: 12px; 
                font-weight: 600; 
                text-align: center;
                border: 1px solid #bfdbfe;
              }
              .cert-item {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                margin-bottom: 15px;
              }
              .cert-icon {
                color: #3b82f6;
                font-size: 16px;
                margin-top: 2px;
              }
              .cert-text {
                font-size: 13px;
                font-weight: 600;
                color: #374151;
              }
              .cert-org {
                font-size: 12px;
                color: #6b7280;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="profile">
                  <div class="profile-image">ðŸ‘¤</div>
                  <div class="profile-info">
                    <h1>${safeData.name}</h1>
                    <div class="title">${safeData.branch}</div>
                    <div class="contact-row">
                      <div class="contact-item">ðŸ“§ ${safeData.email}</div>
                      <div class="contact-item">ðŸ“± ${safeData.phone}</div>
                      <div class="contact-item">ðŸ”— ${safeData.linkedin_url}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-header">
                    <div class="section-accent"></div>
                    <div class="section-title">EXECUTIVE SUMMARY</div>
                  </div>
                  <div class="item-detail">${safeData.objective}</div>
                </div>
                <div class="two-column">
                  <div class="left-column">
                    <div class="section">
                      <div class="section-header">
                        <div class="section-accent"></div>
                        <div class="section-title">PROFESSIONAL EXPERIENCE</div>
                      </div>
                      ${safeData.work_experience.map(exp => `
                        <div class="item">
                          <div class="item-title">${exp.role}</div>
                          <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                          <div class="item-detail">${exp.description}</div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="section">
                      <div class="section-header">
                        <div class="section-accent"></div>
                        <div class="section-title">KEY PROJECTS</div>
                      </div>
                      ${safeData.projects.map(proj => `
                        <div class="item">
                          <div class="item-title">${proj.title}</div>
                          <div class="item-detail">${proj.description}</div>
                          <div class="item-detail" style="color: #3b82f6; font-weight: 600;">Tech Stack: ${proj.technologies || 'N/A'}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  <div class="right-column">
                    <div class="section">
                      <div class="section-header">
                        <div class="section-accent"></div>
                        <div class="section-title">EDUCATION</div>
                      </div>
                      ${safeData.education.map(edu => `
                        <div class="item">
                          <div class="item-title">${edu.degree}</div>
                          <div class="item-subtitle">${edu.field}</div>
                          <div class="item-detail">${edu.institute} | ${edu.year}</div>
                          <div class="item-detail" style="font-weight: 600;">${edu.grade || ''}</div>
                        </div>
                      `).join('')}
                    </div>
                    <div class="section">
                      <div class="section-header">
                        <div class="section-accent"></div>
                        <div class="section-title">CORE COMPETENCIES</div>
                      </div>
                      <div class="skills-grid">
                        ${safeData.skills.slice(0, 12).map(skill => `<div class="skill-badge">${skill}</div>`).join('')}
                      </div>
                    </div>
                    <div class="section">
                      <div class="section-header">
                        <div class="section-accent"></div>
                        <div class="section-title">CERTIFICATIONS</div>
                      </div>
                      ${safeData.certifications.map(cert => `
                        <div class="cert-item">
                          <div class="cert-icon">âœ“</div>
                          <div>
                            <div class="cert-text">${cert.name}</div>
                            <div class="cert-org">${cert.organization} â€¢ ${cert.year}</div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 4) {
      // Creative Designer Resume Template
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              @page { 
                size: A4; 
                margin: 0; 
                padding: 0;
              }
              * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
              }
              body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
                background: #ffffff; 
                line-height: 1.7; 
                color: #374151;
                width: 210mm;
                min-height: 297mm;
                margin: 0 auto;
              }
              .container { 
                width: 100%; 
                min-height: 100vh;
              }
              .header { 
                background: #ffffff; 
                border-bottom: 1px solid #e5e7eb; 
                padding: 50px 40px 40px; 
              }
              .profile { 
                display: flex; 
                align-items: flex-start; 
                gap: 30px; 
              }
              .avatar { 
                width: 80px; 
                height: 80px; 
                background: linear-gradient(135deg, #f3f4f6, #e5e7eb); 
                border-radius: 50%; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                font-size: 24px; 
                font-weight: 600;
                color: #6b7280;
                border: 2px solid #f9fafb;
              }
              .profile-info h1 { 
                font-size: 42px; 
                font-weight: 300; 
                color: #111827; 
                margin-bottom: 10px; 
                letter-spacing: -1px;
              }
              .profile-info .title { 
                font-size: 18px; 
                color: #6b7280; 
                font-weight: 400; 
                margin-bottom: 25px; 
                letter-spacing: 0.5px;
              }
              .contact-grid { 
                display: grid; 
                grid-template-columns: repeat(2, 1fr); 
                gap: 15px; 
                max-width: 500px;
              }
              .contact-item { 
                display: flex; 
                flex-direction: column; 
                gap: 4px; 
              }
              .contact-label { 
                font-size: 11px; 
                color: #9ca3af; 
                font-weight: 600; 
                text-transform: uppercase; 
                letter-spacing: 1px;
              }
              .contact-value { 
                font-size: 14px; 
                color: #374151; 
                font-weight: 500;
              }
              .content { 
                padding: 50px 40px; 
              }
              .section { 
                margin-bottom: 60px; 
              }
              .section-title { 
                font-size: 14px; 
                color: #111827; 
                font-weight: 600; 
                letter-spacing: 2px; 
                margin-bottom: 25px; 
                text-transform: uppercase;
              }
              .summary { 
                font-size: 16px; 
                line-height: 1.8; 
                color: #374151; 
                font-weight: 400;
              }
              .experience-item { 
                margin-bottom: 40px; 
                padding-bottom: 30px;
                border-bottom: 1px solid #f3f4f6;
              }
              .experience-item:last-child {
                border-bottom: none;
              }
              .experience-header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                margin-bottom: 15px;
              }
              .experience-title { 
                font-size: 18px; 
                font-weight: 600; 
                color: #111827; 
                margin-bottom: 5px;
              }
              .experience-company { 
                font-size: 16px; 
                color: #6b7280; 
                font-weight: 500;
              }
              .date-badge { 
                background: #f3f4f6; 
                color: #374151; 
                padding: 6px 12px; 
                border-radius: 20px; 
                font-size: 13px; 
                font-weight: 500;
              }
              .experience-description { 
                font-size: 15px; 
                line-height: 1.6; 
                color: #4b5563;
              }
              .grid { 
                display: flex; 
                gap: 40px; 
              }
              .grid-item { 
                flex: 1; 
              }
              .skills-list { 
                display: flex; 
                flex-direction: column; 
                gap: 12px; 
              }
              .skill-item { 
                display: flex; 
                align-items: center; 
                gap: 10px; 
              }
              .skill-dot { 
                width: 6px; 
                height: 6px; 
                background: #d1d5db; 
                border-radius: 50%; 
              }
              .skill-text { 
                font-size: 14px; 
                color: #4b5563; 
                font-weight: 500;
              }
              .education-item { 
                margin-bottom: 25px; 
              }
              .education-degree { 
                font-size: 16px; 
                font-weight: 600; 
                color: #111827; 
                margin-bottom: 5px;
              }
              .education-details { 
                font-size: 14px; 
                color: #6b7280; 
                margin-bottom: 3px;
              }
              .education-grade { 
                font-size: 13px; 
                color: #9ca3af;
              }
              .projects-grid { 
                display: grid; 
                grid-template-columns: repeat(2, 1fr); 
                gap: 25px; 
              }
              .project-card { 
                padding: 20px; 
                border: 1px solid #f3f4f6; 
                border-radius: 8px; 
                background: #fafafa;
              }
              .project-title { 
                font-size: 15px; 
                font-weight: 600; 
                color: #111827; 
                margin-bottom: 10px;
              }
              .project-description { 
                font-size: 13px; 
                line-height: 1.5; 
                color: #6b7280; 
                margin-bottom: 10px;
              }
              .project-tech { 
                font-size: 12px; 
                color: #9ca3af; 
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="profile">
                  <div class="avatar">${safeData.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                  <div class="profile-info">
                    <h1>${safeData.name}</h1>
                    <div class="title">${safeData.branch}</div>
                    <div class="contact-grid">
                      <div class="contact-item">
                        <div class="contact-label">Email</div>
                        <div class="contact-value">${safeData.email}</div>
                      </div>
                      <div class="contact-item">
                        <div class="contact-label">Phone</div>
                        <div class="contact-value">${safeData.phone}</div>
                      </div>
                      <div class="contact-item">
                        <div class="contact-label">LinkedIn</div>
                        <div class="contact-value">${safeData.linkedin_url}</div>
                      </div>
                      <div class="contact-item">
                        <div class="contact-label">Portfolio</div>
                        <div class="contact-value">${safeData.github_url}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-title">Professional Summary</div>
                  <div class="summary">${safeData.objective}</div>
                </div>
                <div class="section">
                  <div class="section-title">Experience</div>
                  ${safeData.work_experience.map(exp => `
                    <div class="experience-item">
                      <div class="experience-header">
                        <div>
                          <div class="experience-title">${exp.role}</div>
                          <div class="experience-company">${exp.company}</div>
                        </div>
                        <div class="date-badge">${exp.duration}</div>
                      </div>
                      <div class="experience-description">${exp.description}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="grid">
                  <div class="grid-item">
                    <div class="section">
                      <div class="section-title">Skills</div>
                      <div class="skills-list">
                        ${safeData.skills.slice(0, 10).map(skill => `
                          <div class="skill-item">
                            <div class="skill-dot"></div>
                            <div class="skill-text">${skill}</div>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                  <div class="grid-item">
                    <div class="section">
                      <div class="section-title">Education</div>
                      ${safeData.education.map(edu => `
                        <div class="education-item">
                          <div class="education-degree">${edu.degree}</div>
                          <div class="education-details">${edu.field} â€¢ ${edu.institute}</div>
                          <div class="education-details">${edu.year}</div>
                          <div class="education-grade">${edu.grade || ''}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                </div>
                ${safeData.projects.length > 0 ? `
                  <div class="section">
                    <div class="section-title">Notable Projects</div>
                    <div class="projects-grid">
                      ${safeData.projects.slice(0, 4).map(proj => `
                        <div class="project-card">
                          <div class="project-title">${proj.title}</div>
                          <div class="project-description">${proj.description}</div>
                          <div class="project-tech">${proj.technologies || ''}</div>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </body>
        </html>
      `;
    } else if (idx === 3) {
      // Creative Half-Side Resume (Green Theme)
      return `
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Resume - ${safeData.name}</title>
            <style>
              body { font-family: Helvetica, Arial, sans-serif; margin: 0; background: #ffffff; line-height: 1.5; }
              .container { max-width: 900px; margin: auto; display: flex; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 16px; overflow: hidden; }
              .sidebar { width: 35%; background: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%); padding: 25px; color: #ffffff; }
              .content { width: 65%; padding: 25px; background: #ffffff; }
              .profile-section { text-align: center; margin-bottom: 30px; }
              .profile-image { width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 35px; }
              .name { font-size: 22px; color: #ffffff; font-weight: 800; margin-bottom: 5px; }
              .role { font-size: 14px; color: #a7f3d0; font-weight: 600; }
              .sidebar-section { margin-bottom: 25px; }
              .sidebar-title { font-size: 14px; color: #ffffff; font-weight: 700; margin-bottom: 15px; letter-spacing: 1px; }
              .contact-item { display: flex; align-items: center; margin-bottom: 8px; font-size: 11px; color: #d1fae5; }
              .contact-icon { margin-right: 8px; }
              .skill-item { margin-bottom: 12px; }
              .skill-name { font-size: 12px; color: #d1fae5; margin-bottom: 4px; }
              .progress-bar { height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden; }
              .progress-fill { height: 100%; background: #34d399; }
              .section { margin-bottom: 25px; }
              .section-title { font-size: 16px; color: #059669; font-weight: 700; margin-bottom: 10px; }
              .section-line { height: 2px; background: #059669; width: 50px; margin-bottom: 15px; }
              .item { margin-bottom: 20px; padding-left: 15px; border-left: 3px solid #d1fae5; }
              .item-title { font-size: 15px; font-weight: 700; color: #059669; }
              .item-subtitle { font-size: 13px; color: #6b7280; font-weight: 600; }
              .item-detail { font-size: 12px; color: #374151; margin-top: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="sidebar">
                <div class="profile-section">
                  <div class="profile-image">${safeData.name.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
                  <div class="name">${safeData.name}</div>
                  <div class="role">${safeData.branch}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">CONTACT</div>
                  <div class="contact-item">📧 ${safeData.email}</div>
                  <div class="contact-item">📱 ${safeData.phone}</div>
                  <div class="contact-item">📍 ${safeData.address || 'Address'}</div>
                  <div class="contact-item">🔗 ${safeData.linkedin_url}</div>
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">SKILLS</div>
                  ${safeData.skills.slice(0, 8).map((skill, i) => `
                    <div class="skill-item">
                      <div class="skill-name">${skill}</div>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${85 + (i % 3) * 5}%"></div>
                      </div>
                    </div>
                  `).join('')}
                </div>
                <div class="sidebar-section">
                  <div class="sidebar-title">LANGUAGES</div>
                  ${safeData.languages.map(lang => `<div class="contact-item">• ${lang}</div>`).join('')}
                </div>
              </div>
              <div class="content">
                <div class="section">
                  <div class="section-title">PROFESSIONAL SUMMARY</div>
                  <div class="section-line"></div>
                  <div class="item-detail">${safeData.objective}</div>
                </div>
                <div class="section">
                  <div class="section-title">WORK EXPERIENCE</div>
                  <div class="section-line"></div>
                  ${safeData.work_experience.map(exp => `
                    <div class="item">
                      <div class="item-title">${exp.role}</div>
                      <div class="item-subtitle">${exp.company} | ${exp.duration}</div>
                      <div class="item-detail">${exp.description}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">EDUCATION</div>
                  <div class="section-line"></div>
                  ${safeData.education.map(edu => `
                    <div class="item">
                      <div class="item-title">${edu.degree}</div>
                      <div class="item-subtitle">${edu.institute} | ${edu.year}</div>
                      <div class="item-detail">${edu.field} ${edu.grade ? '• Grade: ' + edu.grade : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">KEY PROJECTS</div>
                  <div class="section-line"></div>
                  ${safeData.projects.map(proj => `
                    <div class="item">
                      <div class="item-title">${proj.title}</div>
                      <div class="item-detail">${proj.description}</div>
                      <div class="item-detail" style="color: #10b981; font-weight: 600;">${proj.technologies ? 'Tech: ' + proj.technologies : ''}</div>
                    </div>
                  `).join('')}
                </div>
                <div class="section">
                  <div class="section-title">CERTIFICATIONS</div>
                  <div class="section-line"></div>
                  ${safeData.certifications.map(cert => `
                    <div class="item">
                      <div class="item-detail">${cert.name} | ${cert.organization} | ${cert.year}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

    }
    return `<html><body><div>No template selected</div></body></html>`;
  };

  const handleTemplateSelect = (idx) => {
    setSelectedTemplate(idx);
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const getTemplateName = (idx) => {
    const names = [
      'Modern Tech',
      'Executive Premium',
      'Elegant Professional',
      'Creative Green'
    ];
    return names[idx] || 'Template';
  };

  const getTemplateDescription = (idx) => {
    const descriptions = [
      'Blue gradient tech theme',
      'Premium executive design',
      'Elegant minimalist design',
      'Green half-side creative'
    ];
    return descriptions[idx] || 'Professional template';
  };

  const getTemplateColor = (idx) => {
    const colors = [
      '#1e40af', // Blue
      '#0f172a', // Dark
      '#6366f1', // Indigo
      '#059669'  // Green
    ];
    return colors[idx] || '#0284c7';
  };

  const getTemplateIcon = (idx) => {
    const icons = [
      'code',
      'star',
      'design-services',
      'nature'
    ];
    return icons[idx] || 'description';
  };

  const getTemplateCategory = (idx) => {
    const categories = [
      'Tech',
      'Executive',
      'Professional',
      'Creative'
    ];
    return categories[idx] || 'Professional';
  };

  const handleSaveToDevice = async () => {
    try {
      if (selectedTemplate === null || !studentData) {
        Alert.alert('Error', 'Please select a template and ensure profile data is loaded.');
        return;
      }
      setLoading(true);
      
      const html = getTemplateHTML(selectedTemplate, studentData);
      
      // Generate PDF
      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 595,
        height: 842,
        margins: { left: 0, top: 0, right: 0, bottom: 0 },
        base64: false,
      });
      
      const fileName = `Resume_${studentData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Always use sharing for reliable cross-platform saving
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Resume to Device',
          UTI: 'com.adobe.pdf',
        });
        
        Alert.alert(
          'Save Resume', 
          `Choose where to save "${fileName}":\n\n• Downloads folder\n• Google Drive\n• Files app\n• Other storage locations\n\nThe PDF will be saved as a proper file that you can access anytime.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'File saving is not available on this device.');
      }
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', `Failed to save resume: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (selectedTemplate === null || !studentData) {
        Alert.alert('Error', 'Please select a template and ensure profile data is loaded.');
        return;
      }
      setLoading(true);
      const html = getTemplateHTML(selectedTemplate, studentData);
      
      // Improved PDF generation settings for better quality and full page rendering
      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 595, // A4 width in points (210mm)
        height: 842, // A4 height in points (297mm)
        margins: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        },
        base64: false,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share Your Resume',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', `Failed to share resume: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    if (selectedTemplate === null || !studentData) {
      Alert.alert('Error', 'Please select a template and ensure profile data is loaded.');
      return;
    }
    setShowPreview(true);
    setModalVisible(true);
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleDownload = async () => {
    try {
      if (selectedTemplate === null || !studentData) {
        Alert.alert('Error', 'Please select a template and ensure profile data is loaded.');
        return;
      }
      setLoading(true);
      
      const html = getTemplateHTML(selectedTemplate, studentData);
      
      // Improved PDF generation settings for better quality and full page rendering
      const { uri } = await Print.printToFileAsync({ 
        html,
        width: 595, // A4 width in points (210mm)
        height: 842, // A4 height in points (297mm)
        margins: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        },
        base64: false,
      });
      
      const fileName = `Resume_${studentData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (Platform.OS === 'android') {
        // For Android - Use sharing with save option
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Save Resume PDF',
              UTI: 'com.adobe.pdf',
            });
            Alert.alert(
              'Download Ready', 
              `Your resume "${fileName}" is ready!\n\nUse the share dialog to:\n• Save to Downloads folder\n• Save to Google Drive\n• Share via email/messaging\n• Save to other apps`,
              [
                {
                  text: 'OK',
                  onPress: () => {
                    console.log('Resume shared for download');
                  }
                }
              ]
            );
          } else {
            throw new Error('Sharing not available');
          }
        } catch (androidError) {
          console.log('Android sharing error:', androidError);
          // Final fallback - save to app's document directory
          const finalUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.moveAsync({ from: uri, to: finalUri });
          Alert.alert(
            'Saved to App Storage', 
            `Resume saved to app storage!\n\nFile: ${fileName}\n\nNote: To access this file externally, please use the share feature instead.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Resume saved to app storage');
                }
              }
            ]
          );
        }
        
      } else if (Platform.OS === 'ios') {
        // For iOS - Use sharing to save to Files app
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save Resume PDF',
            UTI: 'com.adobe.pdf',
          });
          Alert.alert(
            'Success', 
            'Resume ready to save!\n\nUse the share dialog to save your resume to Files app or other locations.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log('Resume shared for iOS');
                }
              }
            ]
          );
        } else {
          throw new Error('Sharing not available on this device');
        }
        
      } else {
        // For other platforms - fallback to document directory
        const finalUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.moveAsync({ from: uri, to: finalUri });
        Alert.alert(
          'Success', 
          `Resume saved successfully!\n\nLocation: Documents/${fileName}`,
          [
            {
              text: 'OK',
              onPress: () => {
                console.log('Resume saved to documents');
              }
            }
          ]
        );
      }
      
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', `Failed to download resume: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loaderText}>Loading Profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      {/* Enhanced Header */}
      <View style={styles.enhancedHeader}>
        <View style={styles.headerBackground} />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.enhancedBackButton}
            onPress={() => navigation.navigate('StudentDashboard')}
          >
            <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.enhancedScreenTitle}>Resume Builder</Text>
            <Text style={styles.enhancedScreenSubtitle}>Create your professional resume</Text>
          </View>
          <View style={styles.headerStats}>
            <Text style={styles.statsText}>{templates.length} Templates</Text>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.enhancedContainer} 
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
      >
        {/* Template Selection Header */}
        <View style={styles.selectionHeader}>
          <Text style={styles.selectionTitle}>Choose Your Template</Text>
          <Text style={styles.selectionSubtitle}>
            Select a professional template that best represents your career
          </Text>
        </View>

        {studentData ? (
          <View style={styles.ticketGrid}>
            {templates.map((Template, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.ticketCard,
                  selectedTemplate === idx && styles.selectedTicketCard
                ]}
                onPress={() => {
                  setSelectedTemplate(idx);
                  setShowPreview(true);
                  setModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                {/* Ticket Header */}
                <View style={styles.ticketHeader}>
                  <View style={[styles.ticketIcon, { backgroundColor: getTemplateColor(idx) }]}>
                    <MaterialIcons 
                      name={getTemplateIcon(idx)} 
                      size={24} 
                      color="#ffffff" 
                    />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketTitle}>
                      {getTemplateName(idx)}
                    </Text>
                    <Text style={styles.ticketSubtitle}>
                      {getTemplateDescription(idx)}
                    </Text>
                  </View>
                </View>
                
                {/* Ticket Footer */}
                <View style={styles.ticketFooter}>
                  <View style={styles.ticketTags}>
                    <View style={[styles.ticketTag, { backgroundColor: getTemplateColor(idx) + '20' }]}>
                      <Text style={[styles.ticketTagText, { color: getTemplateColor(idx) }]}>
                        {getTemplateCategory(idx)}
                      </Text>
                    </View>
                  </View>
                  <MaterialIcons 
                    name="arrow-forward" 
                    size={20} 
                    color={getTemplateColor(idx)} 
                  />
                </View>
                
                {/* Ticket Decoration */}
                <View style={styles.ticketDecoration}>
                  <View style={[styles.ticketDot, { backgroundColor: getTemplateColor(idx) }]} />
                  <View style={[styles.ticketDot, { backgroundColor: getTemplateColor(idx) }]} />
                  <View style={[styles.ticketDot, { backgroundColor: getTemplateColor(idx) }]} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.enhancedErrorContainer}>
            <MaterialIcons name="error-outline" size={64} color="#ef4444" />
            <Text style={styles.enhancedErrorTitle}>Profile Data Missing</Text>
            <Text style={styles.enhancedErrorText}>
              Please complete your profile to generate resume templates
            </Text>
            <TouchableOpacity
              style={styles.enhancedRetryButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <MaterialIcons name="person" size={20} color="#ffffff" />
              <Text style={styles.enhancedRetryButtonText}>Complete Profile</Text>
            </TouchableOpacity>
          </View>
        )}


      </ScrollView>

      {/* Enhanced Modal */}
      <ResumeModal 
        visible={modalVisible && showPreview && selectedTemplate !== null} 
        onClose={() => setModalVisible(false)}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.enhancedPreviewTitle}>Resume Preview</Text>
          <Text style={styles.previewSubtitle}>
            {getTemplateName(selectedTemplate)} Template
          </Text>
        </View>
        {templates[selectedTemplate] && studentData && templates[selectedTemplate](studentData)}
        <View style={styles.modalActionBar}>
          <TouchableOpacity 
            style={[styles.modalActionButton, styles.modalShareButton]} 
            onPress={handleShare}
          >
            <MaterialIcons name="share" size={16} color="#10b981" />
            <Text style={[styles.modalActionButtonText, { color: '#10b981', fontSize: 12 }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalActionButton, styles.modalSaveButton]} 
            onPress={handleSaveToDevice}
          >
            <MaterialIcons name="save-alt" size={16} color="#ffffff" />
            <Text style={[styles.modalActionButtonText, { color: '#ffffff', fontSize: 12 }]}>Save to Device</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modalActionButton, styles.modalDownloadButton]} 
            onPress={handleDownload}
          >
            <MaterialIcons name="download" size={16} color="#ffffff" />
            <Text style={[styles.modalActionButtonText, { color: '#ffffff', fontSize: 12 }]}>Quick Download</Text>
          </TouchableOpacity>
        </View>
      </ResumeModal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0f2fe',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#0284c7',
    fontFamily: 'System',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'System',
  },
  retryButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'System',
  },
  resumeCard: {
    width: width * 0.9,
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  headerSection: {
    marginBottom: 20,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0c4a6e',
    fontFamily: 'System',
  },
  role: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    fontFamily: 'System',
  },
  contactRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  contactText: {
    fontSize: 14,
    color: '#475569',
    fontFamily: 'System',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#bae6fd',
    marginVertical: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 10,
    fontFamily: 'System',
  },
  sectionContent: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 6,
    fontFamily: 'System',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillBadge: {
    backgroundColor: '#e0f2fe',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  skillText: {
    fontSize: 13,
    color: '#0c4a6e',
    fontFamily: 'System',
  },
  itemContainer: {
    marginBottom: 15,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0c4a6e',
    fontFamily: 'System',
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#475569',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  itemDetail: {
    fontSize: 14,
    color: '#475569',
    marginTop: 5,
    fontFamily: 'System',
  },
  itemLink: {
    fontSize: 14,
    color: '#0284c7',
    fontFamily: 'System',
  },
  twoColumn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    width: '48%',
  },
  templateTouchable: {
    marginBottom: 20,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#0284c7',
    elevation: 7,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 5,
    fontFamily: 'System',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 20,
    flexWrap: 'wrap',
  },
  actionButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'System',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0c4a6e',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'System',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '92%',
    maxHeight: '85%',
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  closeModalButton: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#7dd3fc',
  },
  closeModalButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'System',
  },
  // New styles for half-shaded templates
  halfShadedSidebar: {
    justifyContent: 'flex-start',
  },
  halfShadedContent: {
    justifyContent: 'flex-start',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 25,
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  sidebarSection: {
    marginBottom: 20,
  },
  sidebarSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
    fontFamily: 'System',
  },
  sidebarText: {
    fontSize: 13,
    color: '#cbd5e1',
    marginBottom: 6,
    fontFamily: 'System',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillProgressBar: {
    marginBottom: 12,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#60a5fa',
    borderRadius: 2,
  },
  modernSkillItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillRating: {
    flexDirection: 'row',
    gap: 2,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageLevel: {
    flexDirection: 'row',
    gap: 3,
  },
  levelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  certificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  // Executive Template Styles
  executiveHeader: {
    position: 'relative',
    overflow: 'hidden',
  },
  geometricPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  geometricShape: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  executiveProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 25,
    zIndex: 1,
  },
  executiveImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  executiveInfo: {
    flex: 1,
  },
  executiveContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  executiveContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  executiveContactText: {
    fontSize: 14,
    color: '#cbd5e1',
    fontFamily: 'System',
  },
  executiveContent: {
    flex: 1,
  },
  executiveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    backgroundColor: '#3b82f6',
    marginRight: 15,
    borderRadius: 2,
  },
  executiveTwoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  executiveSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  executiveSkillBadge: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 8,
  },
  executiveSkillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
    fontFamily: 'System',
  },
  certificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  // Minimalist Template Styles
  minimalistHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  minimalistProfile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 30,
  },
  minimalistImageContainer: {
    alignItems: 'center',
  },
  minimalistAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f9fafb',
  },
  minimalistInitials: {
    fontSize: 24,
    fontWeight: '600',
    color: '#6b7280',
    fontFamily: 'System',
  },
  minimalistInfo: {
    flex: 1,
  },
  minimalistContactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  minimalistContactItem: {
    minWidth: '45%',
  },
  minimalistContactLabel: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: 'System',
  },
  minimalistContactValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    fontFamily: 'System',
  },
  minimalistContent: {
    flex: 1,
  },
  minimalistSectionTitle: {
    textTransform: 'uppercase',
    fontFamily: 'System',
  },
  minimalistExperienceItem: {
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  minimalistExperienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  minimalistExperienceLeft: {
    flex: 1,
  },
  minimalistExperienceRight: {
    marginLeft: 20,
  },
  minimalistDateBadge: {
    textAlign: 'center',
    fontFamily: 'System',
  },
  minimalistGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 30,
  },
  minimalistGridItem: {
    flex: 1,
  },
  minimalistSkillsList: {
    gap: 12,
  },
  minimalistSkillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  minimalistSkillDot: {
    width: 6,
    height: 6,
    backgroundColor: '#d1d5db',
    borderRadius: 3,
  },
  minimalistSkillText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
    fontFamily: 'System',
  },
  minimalistProjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
  },
  minimalistProjectCard: {
    width: '48%',
    padding: 15,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderRadius: 8,
    backgroundColor: '#fafafa',
    marginBottom: 15,
  },
  // Enhanced UI Styles
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  enhancedHeader: {
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0f172a',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    zIndex: 1,
  },
  enhancedBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  headerTextContainer: {
    flex: 1,
  },
  enhancedScreenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'System',
    marginBottom: 2,
  },
  enhancedScreenSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'System',
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  statsText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontFamily: 'System',
  },
  enhancedContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  selectionHeader: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  selectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'System',
  },
  selectionSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'System',
  },
  templatesGrid: {
    gap: 25,
  },
  templateCardWrapper: {
    marginBottom: 20,
  },
  enhancedTemplateCard: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedTemplateCard: {
    borderColor: '#3b82f6',
    elevation: 12,
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  templatePreview: {
    transform: [{ scale: 0.85 }],
    transformOrigin: 'top center',
  },
  templateOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    fontFamily: 'System',
  },
  templateDescription: {
    fontSize: 14,
    color: '#cbd5e1',
    fontFamily: 'System',
  },
  selectedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedErrorContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  enhancedErrorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'System',
  },
  enhancedErrorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
    fontFamily: 'System',
  },
  enhancedRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  enhancedRetryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  enhancedActionBar: {
    marginTop: 40,
    padding: 25,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
  },
  actionBarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
    fontFamily: 'System',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
  },
  enhancedActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    borderWidth: 2,
  },
  previewButton: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  shareButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  downloadButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  enhancedActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  enhancedPreviewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 5,
    fontFamily: 'System',
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  modalActionBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
    borderWidth: 2,
  },
  modalShareButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  modalSaveButton: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  modalDownloadButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  modalActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'System',
  },
  // New Ticket-style Template Cards
  ticketGrid: {
    gap: 15,
    paddingHorizontal: 5,
  },
  ticketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    position: 'relative',
    overflow: 'hidden',
  },
  selectedTicketCard: {
    borderColor: '#3b82f6',
    elevation: 8,
    shadowOpacity: 0.15,
    transform: [{ scale: 1.02 }],
  },
  ticketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  ticketInfo: {
    flex: 1,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'System',
  },
  ticketSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: 'System',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTags: {
    flexDirection: 'row',
    gap: 8,
  },
  ticketTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ticketTagText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  ticketDecoration: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    gap: 4,
  },
  ticketDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  // New template-specific styles
  techHeader: {
    position: 'relative',
  },
  techPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  techShape: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  techProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  techImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  techInfo: {
    flex: 1,
  },
  techContactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  techContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techContactText: {
    fontSize: 12,
    color: '#bfdbfe',
    fontFamily: 'System',
  },
  techContent: {
    backgroundColor: '#ffffff',
  },
  techSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  techSectionAccent: {
    width: 4,
    height: 20,
    backgroundColor: '#1e40af',
    marginRight: 12,
    borderRadius: 2,
  },
  techSkillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techSkillBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  techSkillText: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
    fontFamily: 'System',
  },
  techTwoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  techCertificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Creative template styles
  creativeHeader: {
    position: 'relative',
  },
  creativePattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  creativeShape: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  creativeProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  creativeImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  creativeInfo: {
    flex: 1,
  },
  creativeContactRow: {
    flexDirection: 'row',
    gap: 12,
  },
  creativeContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creativeContactText: {
    fontSize: 11,
    color: '#d1fae5',
    fontFamily: 'System',
  },
  creativeContent: {
    backgroundColor: '#ffffff',
  },
  creativeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  creativeSectionAccent: {
    width: 3,
    height: 16,
    marginRight: 10,
    borderRadius: 2,
  },
  creativeThreeColumn: {
    flexDirection: 'row',
    gap: 15,
  },
  creativeSkillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  creativeSkillBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  creativeSkillText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    fontFamily: 'System',
  },
  creativeLanguageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  creativeLanguageLevel: {
    flexDirection: 'row',
    gap: 3,
  },
  creativeLevelDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  creativeCertificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Creative Half-Side Template Styles
  creativeContainer: {
    flexDirection: 'row',
    minHeight: 600,
  },
  creativeSidebar: {
    justifyContent: 'flex-start',
  },
  creativeSkillItem: {
    marginBottom: 12,
  },
  creativeSkillName: {
    fontSize: 12,
    marginBottom: 4,
  },
  creativeProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  creativeProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  creativeSectionLine: {
    height: 2,
    width: 50,
    marginBottom: 15,
  },
  // Modern Half-Side Template Styles
  modernContainer: {
    flexDirection: 'row',
    minHeight: 600,
  },
  modernContent: {
    backgroundColor: '#ffffff',
  },
  modernSidebar: {
    justifyContent: 'flex-start',
  },
  modernHeader: {
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modernHeaderLine: {
    height: 3,
    width: 80,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modernTimeline: {
    position: 'absolute',
    left: -6,
    top: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modernProfile: {
    alignItems: 'center',
    marginBottom: 25,
  },
  modernImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modernContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  modernContactText: {
    fontSize: 11,
    fontFamily: 'System',
  },
  modernSkillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modernSkillBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  modernSkillText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modernLanguageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modernLanguageText: {
    fontSize: 12,
    fontFamily: 'System',
  },
  modernLanguageLevel: {
    flexDirection: 'row',
    gap: 3,
  },
  modernLevelDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  modernCertItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  modernCertText: {
    flex: 1,
  },
  modernCertName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'System',
  },
  modernCertOrg: {
    fontSize: 9,
    fontFamily: 'System',
  },
});

export default ResumeScreen;
