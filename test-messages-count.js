// Test script for messages unread count
const http = require('http');

// You need to replace this with a valid JWT token from your app
const TOKEN = 'YOUR_JWT_TOKEN_HERE';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/messages/unread/count',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testing /messages/unread/count endpoint...\n');

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', JSON.parse(data));
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
