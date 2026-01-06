// Test script for CV Analysis API
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testCVAnalysis() {
  console.log('🧪 Testing CV Analysis API...\n');

  // Create a simple test image (you can replace this with a real CV image)
  // For testing, we'll use a placeholder
  const testImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=';

  try {
    console.log('📤 Sending CV analysis request...');
    
    const response = await axios.post(`${BASE_URL}/ai/cv/analyze-public`, {
      cvImage: testImageBase64,
      work: 'Electrician'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ CV Analysis API is working!');
      console.log('\nExtracted data:');
      const data = response.data.data;
      console.log('- Skills:', data.skills?.join(', ') || 'None');
      console.log('- Years of Experience:', data.yearsOfExperience || 'Not found');
      console.log('- Education:', data.education?.join(', ') || 'None');
      console.log('- Languages:', data.languages?.join(', ') || 'None');
    } else {
      console.log('\n❌ API returned error:', response.data.message);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

// Test skill suggestions
async function testSkillSuggestions() {
  console.log('\n\n🧪 Testing Skill Suggestions API...\n');

  try {
    const response = await axios.get(`${BASE_URL}/ai/cv/skills/Electrician`);
    
    console.log('📥 Response:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ Skill Suggestions API is working!');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
  }
}

// Run tests
async function runTests() {
  await testSkillSuggestions();
  await testCVAnalysis();
}

runTests();
