import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { FavoritesModule } from './favorites/favorites.module';
import { UploadModule } from './upload/upload.module';
import { TrackingModule } from './tracking/tracking.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { AvailabilityModule } from './availability/availability.module';
import { PaymentsModule } from './payments/payments.module';
import { StripeModule } from './stripe/stripe.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/taskly-db',
      }),
      inject: [ConfigService],
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: configService.get<string>('EMAIL_USER') || 'ayadi.baha35@gmail.com',
            pass: configService.get<string>('EMAIL_PASS') || 'jtdrvttmgitojxgw',
          },
          tls: {
            rejectUnauthorized: false,
          },
          // Force IPv4 to avoid EHOSTUNREACH errors with IPv6
          dnsOptions: {
            family: 4,
          },
        },
        defaults: {
          from: `"Taskly App" <${configService.get<string>('EMAIL_USER') || 'ayadi.baha35@gmail.com'}>`,
        },
      }),
      inject: [ConfigService],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res, path) => {
          // Set proper Content-Type for audio files
          if (path.endsWith('.m4a')) {
            res.setHeader('Content-Type', 'audio/mp4');
          } else if (path.endsWith('.mp3')) {
            res.setHeader('Content-Type', 'audio/mpeg');
          } else if (path.endsWith('.wav')) {
            res.setHeader('Content-Type', 'audio/wav');
          } else if (path.endsWith('.aac')) {
            res.setHeader('Content-Type', 'audio/aac');
          }
          // Allow range requests for audio streaming
          res.setHeader('Accept-Ranges', 'bytes');
        },
      },
    }),
    AuthModule,
    BookingsModule,
    ReviewsModule,
    MessagesModule,
    NotificationsModule,
    AiModule,
    FavoritesModule,
    UploadModule,
    TrackingModule,
    FaceRecognitionModule,
    AvailabilityModule,
    PaymentsModule,
    StripeModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
