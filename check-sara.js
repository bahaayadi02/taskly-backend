const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkSara() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly-db';
  console.log('URI:', uri);
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    const sara = await users.findOne({ fullName: { $regex: /sara/i } });
    
    if (sara) {
      console.log('Sara details:');
      console.log('  fullName:', sara.fullName);
      console.log('  email:', sara.email);
      console.log('  role:', sara.role);
      console.log('  work:', sara.work);
      console.log('  isWorkerAccount:', sara.isWorkerAccount);
    } else {
      console.log('Sara not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

checkSara();
