// Script to set isWorkerAccount = true for all existing workers
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function fixWorkerAccounts() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const users = db.collection('users');
    
    // Update all workers to have isWorkerAccount = true
    const result = await users.updateMany(
      { role: 'worker' },
      { $set: { isWorkerAccount: true } }
    );
    
    console.log(`Updated ${result.modifiedCount} workers with isWorkerAccount = true`);
    
    // Also update users who have work field (they were workers at some point)
    const result2 = await users.updateMany(
      { work: { $exists: true, $ne: null, $ne: '' } },
      { $set: { isWorkerAccount: true } }
    );
    
    console.log(`Updated ${result2.modifiedCount} additional users with work field`);
    
    // Show current state
    const workers = await users.find({ isWorkerAccount: true }).toArray();
    console.log(`\nTotal users with isWorkerAccount = true: ${workers.length}`);
    workers.forEach(w => {
      console.log(`  - ${w.fullName} (${w.email}) - role: ${w.role}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixWorkerAccounts();
