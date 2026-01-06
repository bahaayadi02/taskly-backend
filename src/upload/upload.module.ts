import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MongooseModule } from '@nestjs/mongoose';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { User, UserSchema } from '../schemas/user.schema';

// Ensure uploads directories exist
const profilesDir = join(process.cwd(), 'uploads', 'profiles');
const chatDir = join(process.cwd(), 'uploads', 'chat');
const kycDir = join(process.cwd(), 'uploads', 'kyc');

if (!existsSync(profilesDir)) {
  mkdirSync(profilesDir, { recursive: true });
}
if (!existsSync(chatDir)) {
  mkdirSync(chatDir, { recursive: true });
}
if (!existsSync(kycDir)) {
  mkdirSync(kycDir, { recursive: true });
}

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Determine destination based on route
          const url = req.originalUrl || req.url || '';
          if (url.includes('chat-image') || url.includes('chat-file')) {
            cb(null, chatDir);
          } else if (url.includes('kyc')) {
            cb(null, kycDir);
          } else {
            cb(null, profilesDir);
          }
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const url = req.originalUrl || req.url || '';
          
          if (url.includes('chat-image')) {
            cb(null, `chat-img-${uniqueSuffix}${ext}`);
          } else if (url.includes('chat-file')) {
            cb(null, `chat-file-${uniqueSuffix}${ext}`);
          } else if (url.includes('kyc')) {
            // Determine KYC file type from fieldname
            const fieldname = file.fieldname || 'kyc';
            cb(null, `${fieldname}-${uniqueSuffix}${ext}`);
          } else {
            cb(null, `profile-${uniqueSuffix}${ext}`);
          }
        },
      }),
      fileFilter: (req, file, cb) => {
        const url = req.originalUrl || req.url || '';
        
        // Chat files accept more types
        if (url.includes('chat-file')) {
          cb(null, true); // Accept all files for chat
        } else {
          // Accept only images for profile and chat-image
          if (file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|heic|heif)$/)) {
            cb(null, true);
          } else {
            cb(new Error('Only image files are allowed!'), false);
          }
        }
      },
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB max
      },
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
