// Simple test for Gemini API
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyA6rFj98NN-o5KPPimpmRIXBp8daRLiDHE';

async function testGemini() {
  console.log('🧪 Testing Gemini API...\n');

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              { text: 'Dis "Bonjour" en JSON: {"message": "..."}' }
            ]
          }
        ]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('✅ Gemini API Response:');
    console.log(response.data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testGemini();
