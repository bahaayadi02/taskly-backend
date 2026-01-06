/**
 * Script to test the AI review summary endpoint
 * Run with: node test-ai-summary.js
 * 
 * Make sure the server is running: npm run start:dev
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testAiSummary() {
  console.log('🤖 Testing AI Review Summary API\n');
  console.log('='.repeat(50));

  try {
    // 1. Login as a test user to get token
    console.log('\n1️⃣ Logging in as test customer...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sami.customer@taskly.com',
      password: 'Test@1234',
    });

    if (!loginResponse.data.success) {
      throw new Error('Login failed: ' + loginResponse.data.message);
    }

    const token = loginResponse.data.data.accessToken;
    console.log('   ✅ Login successful');

    // 2. Get list of workers
    console.log('\n2️⃣ Getting workers list...');
    const workersResponse = await axios.get(`${BASE_URL}/auth/workers`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!workersResponse.data.success || !workersResponse.data.data.length) {
      throw new Error('No workers found');
    }

    const workers = workersResponse.data.data.slice(0, 3); // Test with first 3 workers
    console.log(`   ✅ Found ${workersResponse.data.data.length} workers`);

    // 3. Test quick summary (public endpoint)
    console.log('\n3️⃣ Testing quick summary endpoint...');
    for (const worker of workers) {
      const quickResponse = await axios.get(`${BASE_URL}/ai/reviews/quick/${worker._id}`);
      console.log(`\n   👷 ${worker.fullName} (${worker.work}):`);
      console.log(`      ⭐ Rating: ${quickResponse.data.data.rating}/5`);
      console.log(`      📝 ${quickResponse.data.data.summary}`);
      console.log(`      📊 ${quickResponse.data.data.reviewCount} reviews`);
    }

    // 4. Test full AI summary (authenticated)
    console.log('\n4️⃣ Testing full AI summary endpoint...');
    for (const worker of workers) {
      const summaryResponse = await axios.get(
        `${BASE_URL}/ai/reviews/summary/${worker._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = summaryResponse.data.data;
      console.log(`\n   👷 ${data.workerName} (${data.workerJob})`);
      console.log(`   ${'─'.repeat(40)}`);
      console.log(`   ⭐ Average Rating: ${data.averageRating}/5 (${data.totalReviews} reviews)`);
      console.log(`   📊 Sentiment: ${data.sentiment}`);
      console.log(`   \n   📝 Summary:`);
      console.log(`   ${data.summary}`);
      
      if (data.strengths.length > 0) {
        console.log(`   \n   ✅ Strengths:`);
        data.strengths.forEach(s => console.log(`      • ${s}`));
      }
      
      if (data.areasToImprove.length > 0) {
        console.log(`   \n   ⚠️ Areas to improve:`);
        data.areasToImprove.forEach(a => console.log(`      • ${a}`));
      }
      
      if (data.keywords.length > 0) {
        console.log(`   \n   🏷️ Keywords: ${data.keywords.join(', ')}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ All tests passed!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data?.message || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure the server is running: npm run start:dev');
    }
  }
}

testAiSummary();
