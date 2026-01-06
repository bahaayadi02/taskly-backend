/**
 * Test Face Recognition API
 * 
 * Usage: node test-face-recognition.js <profile_image> <selfie_image>
 */

const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testFaceVerification(profileImagePath, selfieImagePath) {
  console.log('🎭 Testing Face Recognition API');
  console.log('================================\n');
  
  // Check if files exist
  if (!fs.existsSync(profileImagePath)) {
    console.log(`❌ Profile image not found: ${profileImagePath}`);
    return;
  }
  
  if (!fs.existsSync(selfieImagePath)) {
    console.log(`❌ Selfie image not found: ${selfieImagePath}`);
    return;
  }
  
  console.log(`📸 Profile image: ${profileImagePath}`);
  console.log(`🤳 Selfie image: ${selfieImagePath}\n`);
  
  try {
    // Create form data
    const form = new FormData();
    form.append('images', fs.createReadStream(profileImagePath));
    form.append('images', fs.createReadStream(selfieImagePath));
    
    console.log('📤 Uploading images...\n');
    
    // Send request
    const response = await fetch(`${BASE_URL}/face-recognition/verify`, {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    
    const result = await response.json();
    
    console.log('📊 Result:');
    console.log('─────────────────────────────────');
    
    if (result.success) {
      const { match, confidence, distance } = result.data;
      
      if (match) {
        console.log('✅ MATCH - Same person!');
      } else {
        console.log('❌ NO MATCH - Different person');
      }
      
      console.log(`   Confidence: ${confidence}%`);
      console.log(`   Distance: ${distance.toFixed(4)}`);
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('❌ Error:', result.message);
    }
    
    console.log('─────────────────────────────────\n');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Main
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: node test-face-recognition.js <profile_image> <selfie_image>');
  console.log('');
  console.log('Example:');
  console.log('  node test-face-recognition.js profile.jpg selfie.jpg');
  process.exit(1);
}

const [profileImage, selfieImage] = args;

testFaceVerification(profileImage, selfieImage);
