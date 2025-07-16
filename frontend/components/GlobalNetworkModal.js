import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  StatusBar,
  BackHandler,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useNetwork } from '../contexts/NetworkContext';

const { width } = Dimensions.get('window');

const GlobalNetworkModal = () => {
  const { showNetworkModal, networkError, retryConnection, setShowNetworkModal } = useNetwork();

  // Prevent back button from closing the modal
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (showNetworkModal) {
        return true; // Prevent back button
      }
      return false;
    });

    return () => backHandler.remove();
  }, [showNetworkModal]);

  if (!showNetworkModal || !networkError) {
    return null;
  }

  const getIconName = () => {
    switch (networkError.type) {
      case 'no_internet':
        return 'wifi-off';
      case 'server_error':
        return 'cloud-off';
      default:
        return 'error-outline';
    }
  };

  const getIconColor = () => {
    switch (networkError.type) {
      case 'no_internet':
        return '#ff6b6b';
      case 'server_error':
        return '#ffa726';
      default:
        return '#ff6b6b';
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showNetworkModal}
      statusBarTranslucent={true}
      onRequestClose={() => {}} // Prevent closing
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.8)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Animatable.View 
          animation="fadeInUp" 
          duration={600}
          style={styles.container}
        >
          {/* University Logo/Header */}
          <View style={styles.headerContainer}>
            <MaterialIcons name="school" size={30} color="#2563eb" />
            <Text style={styles.headerText}>University App</Text>
          </View>

          {/* Error Icon */}
          <Animatable.View 
            animation="bounceIn" 
            delay={300}
            style={styles.iconContainer}
          >
            <MaterialIcons name={getIconName()} size={80} color={getIconColor()} />
          </Animatable.View>

          {/* Title */}
          <Animatable.Text 
            animation="fadeInUp" 
            delay={400}
            style={styles.title}
          >
            {networkError.title}
          </Animatable.Text>

          {/* Message */}
          <Animatable.Text 
            animation="fadeInUp" 
            delay={500}
            style={styles.message}
          >
            {networkError.message}
          </Animatable.Text>

          {/* Connection Tips */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={600}
            style={styles.tipsContainer}
          >
            <Text style={styles.tipsTitle}>Quick Solutions:</Text>
            
            {networkError.type === 'no_internet' ? (
              <>
                <View style={styles.tipRow}>
                  <MaterialIcons name="wifi" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>Check your WiFi connection</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialIcons name="signal-cellular-4-bar" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>Enable mobile data</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialIcons name="airplanemode-active" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>Turn airplane mode on/off</Text>
                </View>
              </>
            ) : (
              <>
                <View style={styles.tipRow}>
                  <MaterialIcons name="refresh" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>University server may be down</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialIcons name="wifi" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>Check your internet connection</Text>
                </View>
                <View style={styles.tipRow}>
                  <MaterialIcons name="access-time" size={16} color="#4CAF50" />
                  <Text style={styles.tipText}>Try again in a few moments</Text>
                </View>
              </>
            )}
          </Animatable.View>

          {/* Status Indicator */}
          <Animatable.View 
            animation="pulse" 
            iterationCount="infinite"
            delay={700}
            style={styles.statusContainer}
          >
            <MaterialIcons name="error" size={16} color="#ff6b6b" />
            <Text style={styles.statusText}>Connection Lost</Text>
          </Animatable.View>

          {/* Retry Button */}
          <Animatable.View 
            animation="fadeInUp" 
            delay={800}
            style={styles.buttonContainer}
          >
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={retryConnection}
              activeOpacity={0.8}
            >
              <MaterialIcons name="refresh" size={24} color="#fff" />
              <Text style={styles.retryButtonText}>Try Again</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 10,
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
    marginBottom: 20,
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  statusText: {
    fontSize: 14,
    color: '#c62828',
    marginLeft: 8,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 30,
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
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
});

export default GlobalNetworkModal;