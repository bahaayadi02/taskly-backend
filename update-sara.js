const { MongoClient } = require('mongodb');
require('dotenv').config();

async function updateSara() {
  // Use the correct database from .env
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskly-db';
  console.log('Connecting to:', uri);
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected!');
    const db = client.db();
    const users = db.collection('users');
    
    // List all users first
    const allUsers = await users.find({}).toArray();
    console.log(`\nTotal users: ${allUsers.length}`);
    
    if (allUsers.length === 0) {
      console.log('No users in database');
      return;
    }
    
    allUsers.forEach(u => console.log(`- ${u.fullName} (${u.email}) - role: ${u.role}, isWorkerAccount: ${u.isWorkerAccount}`));
    
    // Find Sara (case insensitive)
    const sara = await users.findOne({ 
      $or: [
        { fullName: { $regex: /sara/i } },
        { email: { $regex: /sara/i } }
      ]
    });
    
    if (sara) {
      console.log('\nFound Sara:', sara.fullName, sara.email);
      const result = await users.updateOne(
        { _id: sara._id },
        { $set: { role: 'worker', isWorkerAccount: true, work: 'Réparateur' } }
      );
      console.log('Updated:', result.modifiedCount > 0 ? 'Success' : 'Already up to date');
      
      // Verify
      const updated = await users.findOne({ _id: sara._id });
      console.log('Sara now:', {
        fullName: updated.fullName,
        role: updated.role,
        isWorkerAccount: updated.isWorkerAccount,
        work: updated.work
      });
    } else {
      console.log('\nSara not found in database');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

updateSara();
