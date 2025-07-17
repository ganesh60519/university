import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Login from '../Login';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
};

// Mock IP
jest.mock('../../ip', () => ({
  IP: '192.168.29.145'
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons'
}));

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    mockedAxios.post.mockReset();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Network Error Handling', () => {
    test('should show network error when server is unreachable', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      mockedAxios.post.mockRejectedValue(networkError);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Network Error')).toBeTruthy();
        expect(getByText('Unable to connect to the server. Please check your internet connection and try again.')).toBeTruthy();
      });
    });

    test('should show network error for 404 status', async () => {
      const error = new Error('Not Found');
      error.response = { status: 404 };
      mockedAxios.post.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Network Error')).toBeTruthy();
        expect(getByText('Service temporarily unavailable. Please check your internet connection and try again.')).toBeTruthy();
      });
    });

    test('should show network error for 500 status', async () => {
      const error = new Error('Internal Server Error');
      error.response = { status: 500 };
      mockedAxios.post.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Network Error')).toBeTruthy();
        expect(getByText('Server error. Please check your internet connection and try again.')).toBeTruthy();
      });
    });

    test('should show alert for 401 unauthorized status', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      mockedAxios.post.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Invalid Credentials',
          'Invalid email or password. Please try again.',
          [
            {
              text: 'OK',
              onPress: expect.any(Function),
              style: 'cancel',
            },
          ],
          { cancelable: true }
        );
      });
    });

    test('should show login failed for 400 status', async () => {
      const error = new Error('Bad Request');
      error.response = { status: 400 };
      mockedAxios.post.mockRejectedValue(error);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Login Failed')).toBeTruthy();
        expect(getByText('Please check your email and password.')).toBeTruthy();
      });
    });
  });

  describe('API Communication', () => {
    test('should make correct API call to login endpoint', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            id: 1,
            role: 'student',
            name: 'Test User',
            email: 'test@example.com'
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith(
          'http://192.168.29.145:3000/api/auth/login',
          {
            email: 'test@example.com',
            password: 'password123'
          }
        );
      });
    });

    test('should handle successful student login', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            id: 1,
            role: 'student',
            name: 'Test Student',
            email: 'student@example.com'
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'student@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userRole', 'student');
        expect(mockNavigation.replace).toHaveBeenCalledWith('StudentDashboard');
      });
    });

    test('should handle successful faculty login', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            id: 1,
            role: 'faculty',
            name: 'Test Faculty',
            email: 'faculty@example.com'
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'faculty@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userRole', 'faculty');
        expect(mockNavigation.replace).toHaveBeenCalledWith('FacultyDashboard');
      });
    });

    test('should handle successful admin login', async () => {
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: {
            id: 1,
            role: 'admin',
            name: 'Test Admin',
            email: 'admin@example.com'
          }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'admin@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('token', 'mock-token');
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('userRole', 'admin');
        expect(mockNavigation.replace).toHaveBeenCalledWith('AdminDashboard');
      });
    });
  });

  describe('Input Validation', () => {
    test('should show error for empty email field', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please fill in all fields')).toBeTruthy();
      });
    });

    test('should show error for empty password field', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please fill in all fields')).toBeTruthy();
      });
    });

    test('should show error for empty email and password fields', async () => {
      const { getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please fill in all fields')).toBeTruthy();
      });
    });
  });

  describe('Error Container', () => {
    test('should show error container and auto-dismiss after 5 seconds', async () => {
      jest.useFakeTimers();
      
      const { getByText, queryByText } = render(
        <Login navigation={mockNavigation} />
      );

      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please fill in all fields')).toBeTruthy();
      });

      // Fast forward 5 seconds
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(queryByText('Error')).toBeNull();
        expect(queryByText('Please fill in all fields')).toBeNull();
      });

      jest.useRealTimers();
    });

    test('should dismiss error container when close button is pressed', async () => {
      const { getByText, queryByText, getAllByRole } = render(
        <Login navigation={mockNavigation} />
      );

      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.press(loginButton);
      });

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please fill in all fields')).toBeTruthy();
      });

      // Find and press the close button (it should be the last button)
      const buttons = getAllByRole('button');
      const closeButton = buttons[buttons.length - 1];
      await act(async () => {
        fireEvent.press(closeButton);
      });

      await waitFor(() => {
        expect(queryByText('Error')).toBeNull();
        expect(queryByText('Please fill in all fields')).toBeNull();
      });
    });
  });

  describe('UI Functionality', () => {
    test('should toggle password visibility', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const passwordInput = getByPlaceholderText('Enter your password');
      const toggleButton = getByText('Show');

      // Initially password should be hidden
      expect(passwordInput.props.secureTextEntry).toBe(true);

      await act(async () => {
        fireEvent.press(toggleButton);
      });

      expect(passwordInput.props.secureTextEntry).toBe(false);
      expect(getByText('Hide')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Hide'));
      });

      expect(passwordInput.props.secureTextEntry).toBe(true);
      expect(getByText('Show')).toBeTruthy();
    });

    test('should navigate to forgot password screen', async () => {
      const { getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const forgotPasswordButton = getByText('Forgot Password?');

      await act(async () => {
        fireEvent.press(forgotPasswordButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Forgetpassword');
    });

    test('should navigate to registration screen', async () => {
      const { getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const signUpButton = getByText('Sign Up');

      await act(async () => {
        fireEvent.press(signUpButton);
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Registration');
    });

    test('should show loading indicator during login', async () => {
      // Mock a delayed response
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByPlaceholderText, getByText, UNSAFE_getByType } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Check if loading indicator is shown
      expect(UNSAFE_getByType('ActivityIndicator')).toBeTruthy();
    });

    test('should disable inputs during loading', async () => {
      // Mock a delayed response
      mockedAxios.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByPlaceholderText, getByText } = render(
        <Login navigation={mockNavigation} />
      );

      const emailInput = getByPlaceholderText('Enter your email');
      const passwordInput = getByPlaceholderText('Enter your password');
      const loginButton = getByText('Sign In');

      await act(async () => {
        fireEvent.changeText(emailInput, 'test@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      await act(async () => {
        fireEvent.press(loginButton);
      });

      // Check if inputs are disabled
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });
  });
});