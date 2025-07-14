import React from 'react';
import { View, Text, Image } from 'react-native';
import { IP } from '../../ip';

export const ResumeTemplate3 = ({ profile }) => (
  <View style={{ padding: 20 }}>
    <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{profile.name}</Text>
    <Text>{profile.email} | {profile.phone}</Text>
    <Text>{profile.address}</Text>
    <Text>Date of Birth: {profile.dob}</Text>
    <Text>Father's Name: {profile.father_name}</Text>
    <Text>Mother's Name: {profile.mother_name}</Text>
    <Text>Branch: {profile.branch}</Text>
    <Text>LinkedIn: {profile.linkedin_url}</Text>
    <Text>GitHub: {profile.github_url}</Text>
    <Text>Portfolio: {profile.portfolio_url}</Text>
    <Text>Objective: {profile.objective}</Text>
    <Text>Skills: {Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills}</Text>
    <Text>Languages: {Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}</Text>
    <Text>Hobbies: {Array.isArray(profile.hobbies) ? profile.hobbies.join(', ') : profile.hobbies}</Text>
    <Text>Achievements: {Array.isArray(profile.achievements) ? profile.achievements.join(', ') : profile.achievements}</Text>
    <Text>Certifications: {Array.isArray(profile.certifications) ? profile.certifications.join(', ') : profile.certifications}</Text>
    <Text>Education: {JSON.stringify(profile.education)}</Text>
    <Text>Work Experience: {JSON.stringify(profile.work_experience)}</Text>
    <Text>Projects: {JSON.stringify(profile.projects)}</Text>
    {profile.profile_picture ? (
      <Image source={{ uri: `http://${IP}:3000${profile.profile_picture}` }} style={{ width: 100, height: 100, borderRadius: 50 }} />
    ) : null}
  </View>
);

export const ResumeTemplate4 = ({ profile }) => (
  <View style={{ padding: 20, backgroundColor: '#f9fafb' }}>
    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#2563eb' }}>{profile.name}</Text>
    <Text style={{ color: '#374151' }}>{profile.branch}</Text>
    <Text>Email: {profile.email}</Text>
    <Text>Phone: {profile.phone}</Text>
    <Text>Address: {profile.address}</Text>
    <Text>DOB: {profile.dob}</Text>
    <Text>Father: {profile.father_name}</Text>
    <Text>Mother: {profile.mother_name}</Text>
    <Text>LinkedIn: {profile.linkedin_url}</Text>
    <Text>GitHub: {profile.github_url}</Text>
    <Text>Portfolio: {profile.portfolio_url}</Text>
    <Text>Objective: {profile.objective}</Text>
    <Text>Skills: {Array.isArray(profile.skills) ? profile.skills.join(', ') : profile.skills}</Text>
    <Text>Languages: {Array.isArray(profile.languages) ? profile.languages.join(', ') : profile.languages}</Text>
    <Text>Hobbies: {Array.isArray(profile.hobbies) ? profile.hobbies.join(', ') : profile.hobbies}</Text>
    <Text>Achievements: {Array.isArray(profile.achievements) ? profile.achievements.join(', ') : profile.achievements}</Text>
    <Text>Certifications: {Array.isArray(profile.certifications) ? profile.certifications.join(', ') : profile.certifications}</Text>
    <Text>Education: {JSON.stringify(profile.education)}</Text>
    <Text>Work Experience: {JSON.stringify(profile.work_experience)}</Text>
    <Text>Projects: {JSON.stringify(profile.projects)}</Text>
    {profile.profile_picture ? (
      <Image source={{ uri: `http://${IP}:3000${profile.profile_picture}` }} style={{ width: 80, height: 80, borderRadius: 40, marginTop: 10 }} />
    ) : null}
  </View>
);