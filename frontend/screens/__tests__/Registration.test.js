import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Platform, Keyboard } from 'react-native';
import axios from 'axios';
import Registration from '../Registration';

// Mock dependencies
jest.mock('axios');
jest.mock('../ip', () => ({
  IP: '192.168.1.100'
}));

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate
};

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock Keyboard
jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});

describe('Registration Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Happy Path Tests
  describe('Happy Path', () => {
    it('should render registration form correctly', () => {
      const { getByText, getByPlaceholderText } = render(
        <Registration navigation={mockNavigation} />
      );

      expect(getByText('Registration')).toBeTruthy();
      expect(getByText('Create your account to begin')).toBeTruthy();
      expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
      expect(getByPlaceholderText('you@example.com')).toBeTruthy();
      expect(getByPlaceholderText('Enter your password')).toBeTruthy();
      expect(getByText('Sign Up')).toBeTruthy();
    });

    it('should successfully register student', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.1.100:3000/api/student/register',
          {
            name: 'John Doe',
            email: 'john@example.com',
            password: 'password123',
            branch: 'CSE'
          }
        );
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Registration successful!', [
          { text: 'OK', onPress: expect.any(Function) }
        ]);
      });
    });

    it('should successfully register faculty', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText, getByDisplayValue } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Jane Smith');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'jane@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      // Change role to faculty
      const rolePicker = getByDisplayValue('student');
      fireEvent(rolePicker, 'onValueChange', 'faculty');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.1.100:3000/api/faculty/register',
          {
            name: 'Jane Smith',
            email: 'jane@example.com',
            password: 'password123',
            branch: 'CSE'
          }
        );
      });
    });

    it('should successfully register admin', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText, getByDisplayValue } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Admin User');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'admin@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      // Change role to admin
      const rolePicker = getByDisplayValue('student');
      fireEvent(rolePicker, 'onValueChange', 'admin');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          'http://192.168.1.100:3000/api/admin/register',
          {
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            branch: null
          }
        );
      });
    });
  });

  // Input Verification Tests
  describe('Input Verification', () => {
    it('should show error for empty fields', async () => {
      const { getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
      });
    });

    it('should show error for invalid email', async () => {
      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'invalid-email');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
      });
    });

    it('should update branch when role changes', () => {
      const { getByDisplayValue } = render(
        <Registration navigation={mockNavigation} />
      );

      const rolePicker = getByDisplayValue('student');
      fireEvent(rolePicker, 'onValueChange', 'admin');

      // Branch should be cleared for admin
      const branchPicker = getByDisplayValue('CSE');
      expect(branchPicker).toBeTruthy();
    });

    it('should toggle password visibility', () => {
      const { getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      const toggleButton = getByText('Show');
      fireEvent.press(toggleButton);

      expect(getByText('Hide')).toBeTruthy();
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle email already exists error', async () => {
      const mockError = {
        response: {
          status: 409,
          data: { error: 'Email already exists' }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Email Already Exists',
          'An account with this email already exists. Please use a different email or try logging in.'
        );
      });
    });

    it('should handle 400 error', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { error: 'Invalid data' }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Registration Failed',
          'Invalid data'
        );
      });
    });

    it('should handle network error', async () => {
      const mockError = {
        response: null
      };
      axios.post.mockRejectedValue(mockError);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Network Error',
          'Unable to connect to the server. Please check your internet connection and try again.'
        );
      });
    });

    it('should handle server error (500)', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      };
      axios.post.mockRejectedValue(mockError);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Network Error',
          'Server error. Please check your internet connection and try again.'
        );
      });
    });
  });

  // Keyboard Behavior Tests
  describe('Keyboard Behavior', () => {
    it('should dismiss keyboard when tapping outside', () => {
      const { getByTestId } = render(
        <Registration navigation={mockNavigation} />
      );

      // Since TouchableWithoutFeedback is used, tapping outside should dismiss keyboard
      fireEvent.press(getByTestId('keyboard-avoiding-view') || getByTestId('scroll-view'));

      expect(Keyboard.dismiss).toHaveBeenCalled();
    });

    it('should handle keyboard avoiding view behavior', () => {
      const originalPlatform = Platform.OS;
      
      // Test iOS behavior
      Platform.OS = 'ios';
      const { rerender } = render(
        <Registration navigation={mockNavigation} />
      );

      // Test Android behavior
      Platform.OS = 'android';
      rerender(<Registration navigation={mockNavigation} />);

      Platform.OS = originalPlatform;
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    it('should navigate to login on success', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Success', 'Registration successful!', [
          { text: 'OK', onPress: expect.any(Function) }
        ]);
      });

      // Simulate pressing OK button
      const alertCall = Alert.alert.mock.calls[0];
      const okButton = alertCall[2][0];
      okButton.onPress();

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });

    it('should navigate to login when pressing sign in link', () => {
      const { getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.press(getByText('Sign In'));

      expect(mockNavigate).toHaveBeenCalledWith('Login');
    });
  });

  // Loading State Tests
  describe('Loading State', () => {
    it('should show loading indicator during registration', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText, getByTestId } = render(
        <Registration navigation={mockNavigation} />
      );

      fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'John Doe');
      fireEvent.changeText(getByPlaceholderText('you@example.com'), 'john@example.com');
      fireEvent.changeText(getByPlaceholderText('Enter your password'), 'password123');

      fireEvent.press(getByText('Sign Up'));

      // Should show loading indicator
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should disable inputs during loading', async () => {
      const mockResponse = {
        data: { success: true }
      };
      axios.post.mockResolvedValue(mockResponse);

      const { getByPlaceholderText, getByText } = render(
        <Registration navigation={mockNavigation} />
      );

      const nameInput = getByPlaceholderText('Enter your full name');
      const emailInput = getByPlaceholderText('you@example.com');
      const passwordInput = getByPlaceholderText('Enter your password');

      fireEvent.changeText(nameInput, 'John Doe');
      fireEvent.changeText(emailInput, 'john@example.com');
      fireEvent.changeText(passwordInput, 'password123');

      fireEvent.press(getByText('Sign Up'));

      // Inputs should be disabled during loading
      expect(nameInput.props.editable).toBe(false);
      expect(emailInput.props.editable).toBe(false);
      expect(passwordInput.props.editable).toBe(false);
    });
  });
});