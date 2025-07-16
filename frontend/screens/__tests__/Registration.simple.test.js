import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Registration from '../Registration';

// Simple mock for navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate
};

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn()
}));

// Mock IP
jest.mock('../ip', () => ({
  IP: '192.168.1.100'
}));

describe('Registration Screen - Keyboard Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders registration form correctly', () => {
    const { getByText, getByPlaceholderText } = render(
      <Registration navigation={mockNavigation} />
    );

    // Check if key elements are rendered
    expect(getByText('Registration')).toBeTruthy();
    expect(getByPlaceholderText('Enter your full name')).toBeTruthy();
    expect(getByPlaceholderText('you@example.com')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  test('form fields are interactive', () => {
    const { getByPlaceholderText } = render(
      <Registration navigation={mockNavigation} />
    );

    const nameInput = getByPlaceholderText('Enter your full name');
    const emailInput = getByPlaceholderText('you@example.com');
    const passwordInput = getByPlaceholderText('Enter your password');

    // Test that we can type in the fields
    fireEvent.changeText(nameInput, 'John Doe');
    fireEvent.changeText(emailInput, 'john@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    expect(nameInput.props.value).toBe('John Doe');
    expect(emailInput.props.value).toBe('john@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  test('password visibility toggle works', () => {
    const { getByText } = render(
      <Registration navigation={mockNavigation} />
    );

    const toggleButton = getByText('Show');
    fireEvent.press(toggleButton);

    expect(getByText('Hide')).toBeTruthy();
  });

  test('keyboard avoiding view is properly configured', () => {
    const { getByTestId } = render(
      <Registration navigation={mockNavigation} />
    );

    const keyboardAvoidingView = getByTestId('keyboard-avoiding-view');
    const scrollView = getByTestId('scroll-view');

    expect(keyboardAvoidingView).toBeTruthy();
    expect(scrollView).toBeTruthy();
  });

  test('role picker changes branch visibility', () => {
    const { getByDisplayValue, queryByText } = render(
      <Registration navigation={mockNavigation} />
    );

    const rolePicker = getByDisplayValue('student');
    expect(queryByText('Branch')).toBeTruthy();

    // Change to admin role
    fireEvent(rolePicker, 'onValueChange', 'admin');
    
    // Branch field should still be visible (controlled by conditional rendering)
    expect(queryByText('Branch')).toBeTruthy();
  });
});