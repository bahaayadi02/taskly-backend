const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly';
  console.log('Connecting to:', uri);
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    const allUsers = await users.find({}).toArray();
    console.log(`\nTotal users: ${allUsers.length}`);
    
    allUsers.forEach(u => {
      console.log(`- ${u.fullName} | email: ${u.email} | role: ${u.role} | isWorkerAccount: ${u.isWorkerAccount} | work: ${u.work || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUsers();
