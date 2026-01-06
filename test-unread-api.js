// Test the unread messages API endpoint
const http = require('http');
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/taskly-db';

async function testUnreadAPI() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db();
    
    // Get a worker user
    const worker = await db.collection('users').findOne({ role: 'worker' });
    if (!worker) {
      console.log('❌ No worker found');
      return;
    }
    
    console.log(`\n👤 Testing for worker: ${worker.fullName} (${worker._id})`);
    
    // Count unread directly from DB
    const unreadCount = await db.collection('messages').countDocuments({
      receiverId: worker._id,
      isRead: false
    });
    console.log(`📬 Direct DB count: ${unreadCount} unread messages`);
    
    // List the unread messages
    const unreadMessages = await db.collection('messages').find({
      receiverId: worker._id,
      isRead: false
    }).toArray();
    
    console.log('\n📩 Unread messages:');
    for (const msg of unreadMessages) {
      console.log(`   - "${msg.content.substring(0, 50)}..." (from: ${msg.senderId})`);
    }
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testUnreadAPI();
