const { MongoClient } = require('mongodb');
require('dotenv').config();

async function setSaraWorker() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly-db';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    const result = await users.updateOne(
      { fullName: { $regex: /sara/i } },
      { $set: { role: 'worker' } }
    );
    
    console.log('Sara set to worker:', result.modifiedCount > 0 ? 'Success' : 'No change');
    
    const sara = await users.findOne({ fullName: { $regex: /sara/i } });
    console.log('Sara now:', { role: sara.role, work: sara.work });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

setSaraWorker();
