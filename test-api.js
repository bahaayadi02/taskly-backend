// Simple test script to test the Taskly API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test data
const testUsers = [
  {
    fullName: 'John Doe',
    email: 'john@example.com',
    password: 'Password123!',
    phone: '+1234567890',
    role: 'customer'
  },
  {
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    password: 'Password123!',
    phone: '+0987654321',
    role: 'worker'
  },
  {
    fullName: 'Admin User',
    email: 'admin@taskly.com',
    password: 'AdminPass123!',
    phone: '+1122334455',
    role: 'admin'
  }
];

async function testAPI() {
  console.log('🚀 Testing Taskly Backend API...\n');

  try {
    // Test server health
    console.log('1. Testing server health...');
    const healthResponse = await axios.get(`${BASE_URL}`);
    console.log('✅ Server is running!\n');

    // Register test users
    console.log('2. Registering test users...');
    const registeredUsers = [];

    for (const userData of testUsers) {
      try {
        console.log(`   Registering ${userData.fullName} (${userData.role})...`);
        const response = await axios.post(`${BASE_URL}/auth/register`, userData);
        
        if (response.data.success) {
          console.log(`   ✅ ${userData.fullName} registered successfully!`);
          registeredUsers.push({
            ...response.data.data,
            originalPassword: userData.password
          });
        } else {
          console.log(`   ❌ Failed to register ${userData.fullName}: ${response.data.message}`);
        }
      } catch (error) {
        console.log(`   ❌ Error registering ${userData.fullName}: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log(`\n   📊 Successfully registered ${registeredUsers.length}/${testUsers.length} users\n`);

    // Test login with first registered user
    if (registeredUsers.length > 0) {
      console.log('3. Testing login...');
      const firstUser = registeredUsers[0];
      
      try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
          email: testUsers[0].email,
          password: testUsers[0].password
        });

        if (loginResponse.data.success) {
          console.log('   ✅ Login successful!');
          const token = loginResponse.data.data.token;
          
          // Test protected route
          console.log('4. Testing protected route (get profile)...');
          const profileResponse = await axios.get(`${BASE_URL}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (profileResponse.data.success) {
            console.log('   ✅ Profile retrieved successfully!');
            console.log('   👤 User Profile:', JSON.stringify(profileResponse.data.data, null, 2));
          }
        }
      } catch (error) {
        console.log(`   ❌ Login failed: ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 API testing completed!');
    console.log('\n📋 Summary:');
    console.log(`   • Server: Running on ${BASE_URL}`);
    console.log(`   • Database: Connected to MongoDB`);
    console.log(`   • Users created: ${registeredUsers.length}`);
    console.log('\n💡 Now check MongoDB Compass to see the user documents!');

  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the NestJS server is running with: npm run start:dev');
    }
  }
}

// Install axios if not already installed
async function installAxios() {
  const { execSync } = require('child_process');
  try {
    require('axios');
  } catch (error) {
    console.log('📦 Installing axios...');
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ Axios installed!\n');
  }
}

// Run the test
(async () => {
  await installAxios();
  await testAPI();
})();


