/**
 * Script to create test workers with all required fields including work/service
 * Run with: node create-test-workers.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test workers with different services
const testWorkers = [
  {
    fullName: 'Ahmed Ben Ali',
    email: 'ahmed.electrician@test.com',
    password: 'SecurePass123!',
    phone: '+21612345001',
    role: 'worker',
    address: 'Mateur',
    latitude: 37.0403,
    longitude: 9.6658,
    work: 'Electrician'
  },
  {
    fullName: 'Mohamed Trabelsi',
    email: 'mohamed.plumber@test.com',
    password: 'SecurePass123!',
    phone: '+21612345002',
    role: 'worker',
    address: 'Tunis',
    latitude: 36.8065,
    longitude: 10.1815,
    work: 'Plumber'
  },
  {
    fullName: 'Fatima Gharbi',
    email: 'fatima.electrician@test.com',
    password: 'SecurePass123!',
    phone: '+21612345003',
    role: 'worker',
    address: 'Bizerte',
    latitude: 37.2744,
    longitude: 9.8739,
    work: 'Electrician'
  },
  {
    fullName: 'Karim Mansour',
    email: 'karim.carpenter@test.com',
    password: 'SecurePass123!',
    phone: '+21612345004',
    role: 'worker',
    address: 'Sfax',
    latitude: 34.7406,
    longitude: 10.7603,
    work: 'Carpenter'
  },
  {
    fullName: 'Leila Bouazizi',
    email: 'leila.painter@test.com',
    password: 'SecurePass123!',
    phone: '+21612345005',
    role: 'worker',
    address: 'Sousse',
    latitude: 35.8256,
    longitude: 10.6369,
    work: 'Painter'
  },
  {
    fullName: 'Youssef Khedher',
    email: 'youssef.electrician@test.com',
    password: 'SecurePass123!',
    phone: '+21612345006',
    role: 'worker',
    address: 'Ariana',
    latitude: 36.8625,
    longitude: 10.1956,
    work: 'Electrician'
  },
  {
    fullName: 'Nadia Hamdi',
    email: 'nadia.cleaner@test.com',
    password: 'SecurePass123!',
    phone: '+21612345007',
    role: 'worker',
    address: 'Ben Arous',
    latitude: 36.7539,
    longitude: 10.2189,
    work: 'Cleaner'
  },
  {
    fullName: 'Sami Jebali',
    email: 'sami.mechanic@test.com',
    password: 'SecurePass123!',
    phone: '+21612345008',
    role: 'worker',
    address: 'Nabeul',
    latitude: 36.4561,
    longitude: 10.7356,
    work: 'Mechanic'
  }
];

async function createWorker(worker) {
  try {
    console.log(`\n📝 Registering: ${worker.fullName} (${worker.work})`);
    
    // Register
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, worker);
    console.log(`✅ Registered: ${registerResponse.data.message}`);
    
    // Auto-verify (you'll need to get the verification code from email or database)
    // For testing, we'll use a dummy code - you may need to manually verify in the database
    console.log(`⚠️  Please verify ${worker.email} manually in the database`);
    console.log(`   Set isEmailVerified: true for this user`);
    
    return true;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error: ${error.response.data.message}`);
    } else {
      console.error(`❌ Error: ${error.message}`);
    }
    return false;
  }
}

async function createAllWorkers() {
  console.log('🚀 Creating test workers with service categories...\n');
  console.log('=' .repeat(60));
  
  for (const worker of testWorkers) {
    await createWorker(worker);
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n✅ All workers created!');
  console.log('\n⚠️  IMPORTANT: You need to verify these workers manually:');
  console.log('   1. Open MongoDB Compass');
  console.log('   2. Find each new worker by email');
  console.log('   3. Set isEmailVerified: true');
  console.log('   4. Save the document');
  console.log('\nOR run this MongoDB command:');
  console.log('\ndb.users.updateMany(');
  console.log('  { role: "worker", isEmailVerified: false },');
  console.log('  { $set: { isEmailVerified: true } }');
  console.log(');\n');
}

// Run the script
createAllWorkers().catch(console.error);
