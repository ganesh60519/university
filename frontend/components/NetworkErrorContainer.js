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

const NetworkErrorContainer = ({ 
  visible, 
  onRetry, 
  onClose, 
  title = "No Internet Connection",
  message = "Please check your internet connection and try again.",
  showRetryButton = true 
}) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.5)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animatable.View 
          animation="fadeInUp" 
          duration={600}
          style={styles.container}
        >
          {/* Error Icon */}
          <Animatable.View 
            animation="bounceIn" 
            delay={300}
            style={styles.iconContainer}
          >
            <MaterialIcons name="wifi-off" size={80} color="#ff6b6b" />
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

          {/* Additional Info */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={600}
            style={styles.infoContainer}
          >
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Make sure WiFi or mobile data is turned on</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="info-outline" size={16} color="#666" />
              <Text style={styles.infoText}>Try turning airplane mode on and off</Text>
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
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.closeButton} 
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#fff0f0',
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#ffebee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25,
  },
  infoContainer: {
    width: '100%',
    marginBottom: 30,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
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
    backgroundColor: '#f5f5f5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NetworkErrorContainer;