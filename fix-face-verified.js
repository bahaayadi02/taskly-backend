// Script to manually mark a user as face verified
// Run with: node fix-face-verified.js

const { MongoClient } = require('mongodb');

async function markUserAsFaceVerified() {
    const uri = 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db('taskly-db');
        const users = db.collection('users');
        
        // Update the user
        const result = await users.updateOne(
            { email: 'maramsmaty10@gmail.com' },
            { 
                $set: { 
                    isFaceVerified: true, 
                    faceVerifiedAt: new Date() 
                } 
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log('✅ User marked as face verified!');
        } else {
            console.log('⚠️ User not found or already verified');
        }
        
        // Verify the update
        const user = await users.findOne({ email: 'maramsmaty10@gmail.com' });
        console.log('User status:', {
            email: user.email,
            isFaceVerified: user.isFaceVerified,
            faceVerifiedAt: user.faceVerifiedAt
        });
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

markUserAsFaceVerified();
