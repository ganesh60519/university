import axios from 'axios';
import { IP } from '../ip';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: `http://${IP}:3000/api`,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Global error handler that can be used by NetworkContext
let globalErrorHandler = null;

export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = global.authToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors globally
    if (!error.response) {
      // Network error - no response from server
      if (globalErrorHandler) {
        globalErrorHandler({
          title: 'Connection Lost',
          message: 'Unable to connect to the university server. Please check your internet connection.',
          type: 'network_error'
        });
      }
    } else if (error.response.status >= 500) {
      // Server error
      if (globalErrorHandler) {
        globalErrorHandler({
          title: 'Server Error',
          message: 'The university server is experiencing issues. Please try again later.',
          type: 'server_error'
        });
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;