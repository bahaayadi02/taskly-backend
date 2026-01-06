import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const connection = app.get<Connection>(getConnectionToken());

  try {
    console.log('🔧 Fixing review indexes...');

    const reviewCollection = connection.collection('reviews');

    // Get all indexes
    const indexes = await reviewCollection.indexes();
    console.log('📋 Current indexes:', indexes.map(i => i.name));

    // Drop the unique bookingId index if it exists
    try {
      await reviewCollection.dropIndex('bookingId_1');
      console.log('✅ Dropped unique bookingId_1 index');
    } catch (error) {
      console.log('⚠️  bookingId_1 index not found or already dropped');
    }

    // Create a non-unique index for bookingId
    await reviewCollection.createIndex({ bookingId: 1 });
    console.log('✅ Created non-unique bookingId index');

    console.log('\n🎉 Review indexes fixed successfully!');
    console.log('   You can now submit reviews without bookingId');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
