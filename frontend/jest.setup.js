import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  RN.NativeModules = {
    ...RN.NativeModules,
    PlatformConstants: {
      ...RN.NativeModules.PlatformConstants,
      forceTouchAvailable: false,
    },
  };
  
  return RN;
});

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    platform: {
      ios: {
        platform: 'ios',
      },
      android: {
        platform: 'android',
      },
    },
  },
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock Picker
jest.mock('@react-native-picker/picker', () => ({
  Picker: {
    Item: 'PickerItem',
  },
}));

// Silence the warning https://github.com/facebook/react-native/issues/11094#issuecomment-263240420
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock fetch
global.fetch = jest.fn();

// Mock console methods
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};