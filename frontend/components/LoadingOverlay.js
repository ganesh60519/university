import React from 'react';
import { Modal, View, ActivityIndicator, Text, StyleSheet } from 'react-native';

const LoadingOverlay = ({ visible, message = "Loading..." }) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.message}>{message}</Text>
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
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    minWidth: 200,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default LoadingOverlay;