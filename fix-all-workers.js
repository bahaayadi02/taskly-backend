const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixAllWorkers() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly-db';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db();
    const users = db.collection('users');
    
    // Update all workers to have isWorkerAccount = true
    const result = await users.updateMany(
      { role: 'worker' },
      { $set: { isWorkerAccount: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} workers with isWorkerAccount = true`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

fixAllWorkers();
