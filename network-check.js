const axios = require('axios');

const IP = '192.168.29.145';
const PORT = 3000;

async function checkNetworkConnectivity() {
  console.log('🔍 Checking network connectivity for University App...\n');
  
  // Check 1: Server Health Check
  console.log('1. Checking server health...');
  try {
    const response = await axios.get(`http://${IP}:${PORT}/api/auth/health`, {
      timeout: 5000
    });
    console.log('✅ Server is running and healthy!');
    console.log('   Status:', response.status);
    console.log('   Response:', response.data);
    console.log('');
  } catch (error) {
    console.log('❌ Server health check failed:');
    if (error.code === 'ECONNREFUSED') {
      console.log('   → Server is not running on', `http://${IP}:${PORT}`);
      console.log('   → Solution: Start the backend server');
    } else if (error.code === 'ECONNABORTED') {
      console.log('   → Connection timeout');
      console.log('   → Solution: Check network connectivity');
    } else if (error.code === 'ENOTFOUND') {
      console.log('   → Cannot resolve IP address:', IP);
      console.log('   → Solution: Check IP address configuration');
    } else {
      console.log('   → Error:', error.message);
    }
    console.log('');
  }

  // Check 2: Test Login Endpoint
  console.log('2. Testing login endpoint...');
  try {
    const response = await axios.post(`http://${IP}:${PORT}/api/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword'
    });
    console.log('✅ Login endpoint is accessible (though credentials may be invalid)');
    console.log('');
  } catch (error) {
    if (error.response) {
      if (error.response.status === 401) {
        console.log('✅ Login endpoint is working (401 is expected for invalid credentials)');
      } else if (error.response.status === 400) {
        console.log('✅ Login endpoint is working (400 is expected for validation errors)');
      } else {
        console.log('⚠️  Login endpoint returned unexpected status:', error.response.status);
      }
    } else {
      console.log('❌ Login endpoint is not accessible:');
      console.log('   → Error:', error.message);
    }
    console.log('');
  }

  // Check 3: Network Configuration
  console.log('3. Network configuration:');
  console.log('   IP Address:', IP);
  console.log('   Port:', PORT);
  console.log('   Login URL:', `http://${IP}:${PORT}/api/auth/login`);
  console.log('   Health URL:', `http://${IP}:${PORT}/api/auth/health`);
  console.log('');

  // Check 4: Common Network Issues
  console.log('4. Common network issues to check:');
  console.log('   □ Backend server is running');
  console.log('   □ IP address is correct and accessible');
  console.log('   □ Port 3000 is not blocked by firewall');
  console.log('   □ Device is connected to the same network as the server');
  console.log('   □ Database connection is working');
  console.log('');

  console.log('🔧 Troubleshooting steps:');
  console.log('   1. Start the backend server: cd backend && npm start');
  console.log('   2. Check if IP address is correct in frontend/ip.js and backend/ip.js');
  console.log('   3. Verify network connectivity between frontend and backend');
  console.log('   4. Check firewall settings');
  console.log('   5. Review server logs for any errors');
}

// Run the network check
checkNetworkConnectivity();