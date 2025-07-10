import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const ErrorDialog = ({ visible, onClose, error, title = "Error", onRetry = null }) => {
  const getErrorDetails = (error) => {
    if (!error) return { message: 'An unknown error occurred', isNetworkError: false, isSuccess: false };
    
    // Check if it's a success message
    const isSuccess = error.isSuccess === true;
    
    // Check if it's a network error
    const isNetworkError = 
      !isSuccess && (
        error.code === 'NETWORK_ERROR' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ENOTFOUND') ||
        error.message?.includes('ERR_NETWORK') ||
        !error.response
      );

    let message = 'An unexpected error occurred';
    
    if (isSuccess) {
      message = error.message || 'Operation completed successfully';
    } else if (isNetworkError) {
      message = 'Network connection failed. Please check your internet connection and try again.';
    } else if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }

    return { message, isNetworkError, isSuccess };
  };

  const { message, isNetworkError, isSuccess } = getErrorDetails(error);

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <MaterialIcons 
              name={isSuccess ? "check-circle" : isNetworkError ? "wifi-off" : "error-outline"} 
              size={32} 
              color={isSuccess ? "#10b981" : isNetworkError ? "#f59e0b" : "#ef4444"} 
            />
            <Text style={styles.title}>
              {isSuccess ? "Success" : isNetworkError ? "Network Error" : title}
            </Text>
          </View>
          
          <View style={styles.content}>
            <Text style={styles.message}>{message}</Text>
            
            {isNetworkError && !isSuccess && (
              <View style={styles.networkTips}>
                <Text style={styles.tipsTitle}>Troubleshooting Tips:</Text>
                <Text style={styles.tip}>• Check your internet connection</Text>
                <Text style={styles.tip}>• Ensure you're connected to WiFi or mobile data</Text>
                <Text style={styles.tip}>• Try refreshing the page</Text>
                <Text style={styles.tip}>• Contact support if the problem persists</Text>
              </View>
            )}
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[
                styles.button, 
                isSuccess ? styles.successButton : 
                isNetworkError ? styles.warningButton : 
                styles.errorButton
              ]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 12,
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  message: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
    marginBottom: 16,
  },
  networkTips: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  tip: {
    fontSize: 13,
    color: '#92400e',
    marginBottom: 4,
    paddingLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  errorButton: {
    backgroundColor: '#ef4444',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  successButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorDialog;