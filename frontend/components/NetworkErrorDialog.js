import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const NetworkErrorDialog = ({ 
  visible, 
  onRetry, 
  onClose, 
  title = "No Internet Connection",
  message = "Please check your internet connection and try again.",
  showRetryButton = true,
  retryButtonText = "Try Again"
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.6)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animatable.View 
          animation="fadeInUp" 
          duration={600}
          style={styles.container}
        >
          {/* Error Icon with Animation */}
          <Animatable.View 
            animation="bounceIn" 
            delay={300}
            style={styles.iconContainer}
          >
            <MaterialIcons name="wifi-off" size={60} color="#ff4757" />
          </Animatable.View>

          {/* Title */}
          <Animatable.Text 
            animation="fadeInUp" 
            delay={400}
            style={styles.title}
          >
            {title}
          </Animatable.Text>

          {/* Message */}
          <Animatable.Text 
            animation="fadeInUp" 
            delay={500}
            style={styles.message}
          >
            {message}
          </Animatable.Text>

          {/* Network Tips */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={600}
            style={styles.tipsContainer}
          >
            <Text style={styles.tipsTitle}>Quick fixes:</Text>
            <View style={styles.tipRow}>
              <MaterialIcons name="check-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Check WiFi or mobile data</Text>
            </View>
            <View style={styles.tipRow}>
              <MaterialIcons name="check-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Try turning airplane mode on/off</Text>
            </View>
            <View style={styles.tipRow}>
              <MaterialIcons name="check-circle-outline" size={16} color="#4CAF50" />
              <Text style={styles.tipText}>Move to a better signal area</Text>
            </View>
          </Animatable.View>

          {/* Buttons */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={700}
            style={styles.buttonContainer}
          >
            {showRetryButton && (
              <TouchableOpacity 
                style={styles.retryButton} 
                onPress={onRetry}
                activeOpacity={0.8}
              >
                <MaterialIcons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>{retryButtonText}</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.closeButton, !showRetryButton && styles.closeButtonFull]} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    width: width * 0.9,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 15,
    },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 15,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  iconContainer: {
    marginBottom: 20,
    padding: 25,
    backgroundColor: '#fff5f5',
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#ffe0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  tipsContainer: {
    width: '100%',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    marginBottom: 25,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#5a6c7d',
    marginLeft: 10,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  closeButtonFull: {
    flex: 1,
  },
  closeButtonText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetworkErrorDialog;