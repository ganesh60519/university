import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import Login from './screens/Login';
import Registration from './screens/Registration';
import ForgetPassword from './screens/forgetpassword';
import StudentDashboard from './screens/students/StudentDashboard';
import EditProfileScreen from './screens/students/EditProfileScreen';
import ResumeScreen from './screens/students/resumeScreen';

import FacultyDashboard from './screens/faculty/FacultyDashboard';
import AdminDashboard from './screens/admin/AdminDashboard';
import { NetworkProvider } from './contexts/NetworkContext';
import GlobalNetworkModal from './components/GlobalNetworkModal';

const Stack = createStackNavigator();

export default function App() {
  return (
    <NetworkProvider>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Login"
          screenOptions={{
            headerShown: false
          }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Registration" component={Registration} />
          <Stack.Screen name="Forgetpassword" component={ForgetPassword} />
          <Stack.Screen name="StudentDashboard" component={StudentDashboard} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Resume" component={ResumeScreen} />
        
          <Stack.Screen name="FacultyDashboard" component={FacultyDashboard} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
        </Stack.Navigator>
        <GlobalNetworkModal />
      </NavigationContainer>
    </NetworkProvider>
  );
}