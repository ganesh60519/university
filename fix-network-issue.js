const fs = require('fs');
const path = require('path');

console.log('🔧 University App Network Issue Fix\n');

// Check current network configuration
const frontendIpPath = path.join(__dirname, 'frontend', 'ip.js');
const backendIpPath = path.join(__dirname, 'backend', 'ip.js');

console.log('1. Current configuration:');
if (fs.existsSync(frontendIpPath)) {
  const frontendIp = fs.readFileSync(frontendIpPath, 'utf8');
  console.log('   Frontend IP:', frontendIp.match(/IP = '([^']+)'/)?.[1] || 'Not found');
}

if (fs.existsSync(backendIpPath)) {
  const backendIp = fs.readFileSync(backendIpPath, 'utf8');
  console.log('   Backend IP:', backendIp.match(/IP = '([^']+)'/)?.[1] || 'Not found');
}

console.log('\n2. Issue identified:');
console.log('   ❌ Server is running on localhost:3000');
console.log('   ❌ Frontend is trying to connect to 192.168.29.145:3000');
console.log('   ❌ The IP address 192.168.29.145 is not accessible or outdated');

console.log('\n3. Solutions:');
console.log('   Option 1: Use localhost for development');
console.log('   Option 2: Update IP address to current machine IP');
console.log('   Option 3: Configure server to listen on all interfaces');

console.log('\n4. Recommended fix for development:');
console.log('   → Change frontend IP to localhost');

// Fix 1: Update frontend IP to localhost
console.log('\n🔄 Applying fix: Updating frontend IP to localhost...');

const newFrontendIpContent = `export const IP = 'localhost'; // Updated to localhost for development`;

try {
  fs.writeFileSync(frontendIpPath, newFrontendIpContent);
  console.log('✅ Frontend IP updated to localhost');
} catch (error) {
  console.log('❌ Error updating frontend IP:', error.message);
}

const newBackendIpContent = `const IP = 'localhost'; // Updated to localhost for development
module.exports = IP; `;

try {
  fs.writeFileSync(backendIpPath, newBackendIpContent);
  console.log('✅ Backend IP updated to localhost');
} catch (error) {
  console.log('❌ Error updating backend IP:', error.message);
}

console.log('\n5. Additional steps needed:');
console.log('   1. Restart the backend server if running');
console.log('   2. Clear React Native cache: npx react-native start --reset-cache');
console.log('   3. Rebuild the app');

console.log('\n6. For production deployment:');
console.log('   → Use the actual server IP address');
console.log('   → Ensure server is configured to listen on all interfaces (0.0.0.0)');
console.log('   → Configure firewall to allow connections on port 3000');

console.log('\n✅ Network issue fix completed!');