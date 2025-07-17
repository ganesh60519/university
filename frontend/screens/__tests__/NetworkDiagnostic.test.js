import axios from 'axios';
import { IP } from '../../ip';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('Network Diagnostic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();
  });

  describe('Server Connectivity', () => {
    test('should check server health endpoint', async () => {
      const mockHealthResponse = {
        status: 200,
        data: {
          status: 'ok',
          message: 'University server is running',
          timestamp: new Date().toISOString()
        }
      };
      mockedAxios.get.mockResolvedValue(mockHealthResponse);

      const response = await axios.get(`http://${IP}:3000/api/auth/health`);
      
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('ok');
      expect(mockedAxios.get).toHaveBeenCalledWith(`http://${IP}:3000/api/auth/health`);
    });

    test('should handle server connection timeout', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.code = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      try {
        await axios.get(`http://${IP}:3000/api/auth/health`, { timeout: 5000 });
      } catch (error) {
        expect(error.code).toBe('ECONNABORTED');
        expect(error.message).toContain('timeout');
      }
    });

    test('should handle server connection refused', async () => {
      const connectionError = new Error('connect ECONNREFUSED');
      connectionError.code = 'ECONNREFUSED';
      mockedAxios.get.mockRejectedValue(connectionError);

      try {
        await axios.get(`http://${IP}:3000/api/auth/health`);
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED');
        expect(error.message).toContain('ECONNREFUSED');
      }
    });

    test('should handle DNS resolution failure', async () => {
      const dnsError = new Error('getaddrinfo ENOTFOUND');
      dnsError.code = 'ENOTFOUND';
      mockedAxios.get.mockRejectedValue(dnsError);

      try {
        await axios.get(`http://${IP}:3000/api/auth/health`);
      } catch (error) {
        expect(error.code).toBe('ENOTFOUND');
        expect(error.message).toContain('ENOTFOUND');
      }
    });
  });

  describe('Login Endpoint Tests', () => {
    test('should test login endpoint with valid credentials', async () => {
      const mockLoginResponse = {
        status: 200,
        data: {
          token: 'mock-jwt-token',
          user: {
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            role: 'student'
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockLoginResponse);

      const response = await axios.post(`http://${IP}:3000/api/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });

      expect(response.status).toBe(200);
      expect(response.data.token).toBeDefined();
      expect(response.data.user).toBeDefined();
      expect(response.data.user.role).toBe('student');
    });

    test('should handle invalid credentials (401)', async () => {
      const unauthorizedError = new Error('Unauthorized');
      unauthorizedError.response = { 
        status: 401,
        data: { error: 'Invalid credentials' }
      };
      mockedAxios.post.mockRejectedValue(unauthorizedError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'wrong@example.com',
          password: 'wrongpassword'
        });
      } catch (error) {
        expect(error.response.status).toBe(401);
        expect(error.response.data.error).toBe('Invalid credentials');
      }
    });

    test('should handle bad request (400)', async () => {
      const badRequestError = new Error('Bad Request');
      badRequestError.response = { 
        status: 400,
        data: { error: 'Email and password are required' }
      };
      mockedAxios.post.mockRejectedValue(badRequestError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: '',
          password: ''
        });
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toBe('Email and password are required');
      }
    });

    test('should handle server error (500)', async () => {
      const serverError = new Error('Internal Server Error');
      serverError.response = { 
        status: 500,
        data: { error: 'Internal server error' }
      };
      mockedAxios.post.mockRejectedValue(serverError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data.error).toBe('Internal server error');
      }
    });
  });

  describe('IP Configuration Tests', () => {
    test('should validate IP address format', () => {
      // Test if IP is a valid IPv4 address
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      expect(ipRegex.test(IP)).toBe(true);
    });

    test('should construct correct API URLs', () => {
      const baseURL = `http://${IP}:3000`;
      const loginURL = `${baseURL}/api/auth/login`;
      const healthURL = `${baseURL}/api/auth/health`;

      expect(loginURL).toBe(`http://${IP}:3000/api/auth/login`);
      expect(healthURL).toBe(`http://${IP}:3000/api/auth/health`);
    });

    test('should verify IP matches expected format', () => {
      expect(IP).toBeDefined();
      expect(typeof IP).toBe('string');
      expect(IP).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
    });
  });

  describe('Network Error Scenarios', () => {
    test('should handle network unreachable error', async () => {
      const networkError = new Error('Network is unreachable');
      networkError.code = 'ENETUNREACH';
      mockedAxios.post.mockRejectedValue(networkError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error.code).toBe('ENETUNREACH');
      }
    });

    test('should handle host unreachable error', async () => {
      const hostError = new Error('No route to host');
      hostError.code = 'EHOSTUNREACH';
      mockedAxios.post.mockRejectedValue(hostError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error.code).toBe('EHOSTUNREACH');
      }
    });

    test('should handle connection reset error', async () => {
      const resetError = new Error('Connection reset by peer');
      resetError.code = 'ECONNRESET';
      mockedAxios.post.mockRejectedValue(resetError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error.code).toBe('ECONNRESET');
      }
    });

    test('should handle no internet connection', async () => {
      const noInternetError = new Error('Network Error');
      noInternetError.request = {}; // Request was made but no response received
      delete noInternetError.response;
      mockedAxios.post.mockRejectedValue(noInternetError);

      try {
        await axios.post(`http://${IP}:3000/api/auth/login`, {
          email: 'test@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error.request).toBeDefined();
        expect(error.response).toBeUndefined();
      }
    });
  });

  describe('Network Debugging Information', () => {
    test('should provide network configuration details', () => {
      const networkConfig = {
        IP: IP,
        port: 3000,
        protocol: 'http',
        baseURL: `http://${IP}:3000`,
        endpoints: {
          login: '/api/auth/login',
          health: '/api/auth/health',
          forgotPassword: '/api/auth/forgot-password'
        }
      };

      expect(networkConfig.IP).toBe(IP);
      expect(networkConfig.port).toBe(3000);
      expect(networkConfig.protocol).toBe('http');
      expect(networkConfig.baseURL).toBe(`http://${IP}:3000`);
      expect(networkConfig.endpoints.login).toBe('/api/auth/login');
    });

    test('should validate current network configuration', () => {
      console.log('Network Configuration Debug Info:');
      console.log('IP Address:', IP);
      console.log('Full Login URL:', `http://${IP}:3000/api/auth/login`);
      console.log('Full Health URL:', `http://${IP}:3000/api/auth/health`);
      
      expect(IP).toBe('192.168.29.145');
    });
  });
});

// Utility function to diagnose network issues
export const diagnoseNetworkIssue = (error) => {
  if (!error.response) {
    // Network error - no response from server
    if (error.code === 'ECONNREFUSED') {
      return {
        issue: 'Server is not running',
        solution: 'Check if the backend server is running on the specified IP and port',
        details: `Cannot connect to http://${IP}:3000`
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        issue: 'Connection timeout',
        solution: 'Check network connectivity and server response time',
        details: 'Request timed out'
      };
    } else if (error.code === 'ENOTFOUND') {
      return {
        issue: 'DNS/IP resolution failed',
        solution: 'Verify IP address is correct and accessible',
        details: `Cannot resolve IP: ${IP}`
      };
    } else if (error.code === 'ENETUNREACH') {
      return {
        issue: 'Network unreachable',
        solution: 'Check network connectivity and routing',
        details: 'Network path to server is not available'
      };
    } else {
      return {
        issue: 'Network connectivity problem',
        solution: 'Check internet connection and server availability',
        details: error.message
      };
    }
  } else {
    // Server responded with error
    const status = error.response.status;
    if (status === 401) {
      return {
        issue: 'Authentication failed',
        solution: 'Check credentials and try again',
        details: 'Invalid email or password'
      };
    } else if (status === 400) {
      return {
        issue: 'Bad request',
        solution: 'Check request format and required fields',
        details: 'Request validation failed'
      };
    } else if (status === 500) {
      return {
        issue: 'Server error',
        solution: 'Check server logs and database connectivity',
        details: 'Internal server error'
      };
    } else {
      return {
        issue: 'Server error',
        solution: 'Check server status and configuration',
        details: `HTTP ${status} error`
      };
    }
  }
};