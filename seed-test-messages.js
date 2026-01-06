// Script to seed test messages in the database
const { MongoClient, ObjectId } = require('mongodb');

const MONGODB_URI = 'mongodb://localhost:27017/taskly-db';

async function seedTestMessages() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Get a confirmed booking
    const bookings = await db.collection('bookings').find({
      status: { $in: ['confirmed', 'on_the_way', 'in_progress', 'completed'] }
    }).toArray();
    
    console.log(`📋 Found ${bookings.length} chat-enabled bookings`);
    
    if (bookings.length === 0) {
      console.log('❌ No confirmed bookings found. Creating a test booking first...');
      
      // Get a customer and worker
      const customer = await db.collection('users').findOne({ role: 'customer' });
      const worker = await db.collection('users').findOne({ role: 'worker' });
      
      if (!customer || !worker) {
        console.log('❌ Need at least one customer and one worker in the database');
        return;
      }
      
      // Create a confirmed booking
      const booking = {
        customerId: customer._id,
        workerId: worker._id,
        serviceType: 'Plomberie',
        description: 'Test booking for messages',
        status: 'confirmed',
        scheduledDate: new Date(),
        scheduledTime: '10:00',
        estimatedDuration: 2,
        price: 100,
        address: {
          street: '123 Test Street',
          city: 'Paris',
          postalCode: '75001',
          country: 'France'
        },
        location: {
          type: 'Point',
          coordinates: [2.3522, 48.8566]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await db.collection('bookings').insertOne(booking);
      console.log(`✅ Created test booking: ${result.insertedId}`);
      
      bookings.push({ ...booking, _id: result.insertedId });
    }
    
    // Get existing messages count
    const existingMessages = await db.collection('messages').countDocuments();
    console.log(`📬 Existing messages in database: ${existingMessages}`);
    
    // Create test messages for the first booking
    const booking = bookings[0];
    console.log(`\n📝 Creating test messages for booking: ${booking._id}`);
    console.log(`   Customer: ${booking.customerId}`);
    console.log(`   Worker: ${booking.workerId}`);
    
    const messages = [
      {
        bookingId: booking._id,
        senderId: booking.customerId,
        receiverId: booking.workerId,
        type: 'text',
        content: 'Bonjour, êtes-vous disponible demain ?',
        attachments: [],
        isRead: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000)
      },
      {
        bookingId: booking._id,
        senderId: booking.workerId,
        receiverId: booking.customerId,
        type: 'text',
        content: 'Oui, je suis disponible à partir de 10h.',
        attachments: [],
        isRead: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 3000000), // 50 min ago
        updatedAt: new Date(Date.now() - 3000000)
      },
      {
        bookingId: booking._id,
        senderId: booking.customerId,
        receiverId: booking.workerId,
        type: 'text',
        content: 'Parfait, à demain alors !',
        attachments: [],
        isRead: false,
        isDeleted: false,
        createdAt: new Date(Date.now() - 1800000), // 30 min ago
        updatedAt: new Date(Date.now() - 1800000)
      }
    ];
    
    const insertResult = await db.collection('messages').insertMany(messages);
    console.log(`✅ Created ${insertResult.insertedCount} test messages`);
    
    // Count unread messages for worker
    const unreadForWorker = await db.collection('messages').countDocuments({
      receiverId: booking.workerId,
      isRead: false
    });
    console.log(`\n📬 Unread messages for worker: ${unreadForWorker}`);
    
    // Count unread messages for customer
    const unreadForCustomer = await db.collection('messages').countDocuments({
      receiverId: booking.customerId,
      isRead: false
    });
    console.log(`📬 Unread messages for customer: ${unreadForCustomer}`);
    
    // List all users with their unread counts
    console.log('\n📊 Unread messages by user:');
    const users = await db.collection('users').find({}).toArray();
    for (const user of users) {
      const unread = await db.collection('messages').countDocuments({
        receiverId: user._id,
        isRead: false
      });
      if (unread > 0) {
        console.log(`   ${user.fullName} (${user.role}): ${unread} unread`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Done');
  }
}

seedTestMessages();
