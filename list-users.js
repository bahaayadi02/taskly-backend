const { MongoClient } = require('mongodb');

async function listUsers() {
    const client = new MongoClient('mongodb://localhost:27017');
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('taskly');
        const users = await db.collection('users').find({}).toArray();
        
        console.log('\n=== All Users ===');
        users.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  isFaceVerified: ${u.isFaceVerified}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

listUsers();
