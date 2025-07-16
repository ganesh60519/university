import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import axios from 'axios';
import { IP } from '../ip';
import { setGlobalErrorHandler } from '../utils/axiosConfig';

const NetworkContext = createContext();

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

export const NetworkProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  // Check if server is reachable
  const checkServerConnection = async () => {
    try {
      const response = await axios.get(`http://${IP}:3000/api/auth/health`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        if (!isServerReachable) {
          setIsServerReachable(true);
          setShowNetworkModal(false);
          setNetworkError(null);
        }
        return true;
      }
    } catch (error) {
      console.log('Server connection check failed:', error.message);
      if (isServerReachable) {
        setIsServerReachable(false);
        setNetworkError({
          title: 'Server Connection Lost',
          message: 'Unable to connect to the university server. Please check your internet connection.',
          type: 'server_error'
        });
        setShowNetworkModal(true);
      }
      return false;
    }
  };

  // Monitor network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('Network state changed:', state);
      
      if (state.isConnected !== isConnected) {
        setIsConnected(state.isConnected);
        
        if (!state.isConnected) {
          // Internet connection lost
          setNetworkError({
            title: 'No Internet Connection',
            message: 'Your device is not connected to the internet. Please check your WiFi or mobile data connection.',
            type: 'no_internet'
          });
          setShowNetworkModal(true);
          setIsServerReachable(false);
        } else {
          // Internet connection restored
          setShowNetworkModal(false);
          setNetworkError(null);
          // Check server connection when internet is restored
          setTimeout(checkServerConnection, 1000);
        }
      }
    });

    return () => unsubscribe();
  }, [isConnected, isServerReachable]);

  // Check server connection periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        checkServerConnection();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, isServerReachable]);

  // Check server connection on app state change
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active' && isConnected) {
        checkServerConnection();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [isConnected]);

  // Initial server check and setup global error handler
  useEffect(() => {
    checkServerConnection();
    
    // Setup global error handler for axios interceptor
    setGlobalErrorHandler((error) => {
      setNetworkError(error);
      setShowNetworkModal(true);
    });
  }, []);

  // Manual retry function
  const retryConnection = async () => {
    setShowNetworkModal(false);
    
    // First check internet connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      setNetworkError({
        title: 'No Internet Connection',
        message: 'Your device is not connected to the internet. Please check your WiFi or mobile data connection.',
        type: 'no_internet'
      });
      setShowNetworkModal(true);
      return;
    }
    
    // Then check server connection
    const serverReachable = await checkServerConnection();
    if (!serverReachable) {
      setTimeout(() => {
        setShowNetworkModal(true);
      }, 1000);
    }
  };

  const value = {
    isConnected,
    isServerReachable,
    showNetworkModal,
    networkError,
    retryConnection,
    checkServerConnection,
    setShowNetworkModal
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
};

export default NetworkContext;