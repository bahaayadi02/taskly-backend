import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userModel = app.get<Model<User>>(getModelToken(User.name));

  try {
    // Read workers data from JSON file
    const workersData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'workers.json'), 'utf-8'),
    );

    console.log(`📦 Found ${workersData.length} workers to seed...`);

    let created = 0;
    let skipped = 0;

    for (const workerData of workersData) {
      // Check if user already exists
      const existingUser = await userModel.findOne({ email: workerData.email });

      if (existingUser) {
        console.log(`⏭️  Skipping ${workerData.fullName} - already exists`);
        skipped++;
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(workerData.password, 10);

      // Create the worker
      const worker = new userModel({
        ...workerData,
        password: hashedPassword,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      });

      await worker.save();
      console.log(`✅ Created worker: ${workerData.fullName} (${workerData.work})`);
      created++;
    }

    console.log('\n🎉 Seeding completed!');
    console.log(`   ✅ Created: ${created} workers`);
    console.log(`   ⏭️  Skipped: ${skipped} workers`);
    console.log('\n📧 All workers can login with password: Test@1234');

  } catch (error) {
    console.error('❌ Error seeding workers:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
