import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Notification, NotificationDocument, NotificationType } from '../schemas/notification.schema';
import * as https from 'https';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  type?: NotificationType;
}

@Injectable()
export class PushNotificationService {
  // Store device tokens in memory (in production, store in database)
  private deviceTokens: Map<string, { token: string; platform: 'ios' | 'android' }[]> = new Map();
  
  // APNs configuration
  private apnsKeyId: string;
  private apnsTeamId: string;
  private apnsBundleId: string;
  private apnsKey: string | null = null;
  private apnsToken: string | null = null;
  private apnsTokenExpiry: number = 0;

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {
    // Load APNs configuration from environment
    this.apnsKeyId = process.env.APNS_KEY_ID || '';
    this.apnsTeamId = process.env.APNS_TEAM_ID || '';
    this.apnsBundleId = process.env.APNS_BUNDLE_ID || 'com.taskly.app';
    
    // Try to load APNs key from file
    const keyPath = path.join(process.cwd(), 'apns-key.p8');
    if (fs.existsSync(keyPath)) {
      this.apnsKey = fs.readFileSync(keyPath, 'utf8');
      console.log('✅ APNs key loaded from file');
    } else {
      console.log('⚠️ APNs key file not found - push notifications will be simulated');
    }
  }

  // Register device token for a user
  registerDevice(userId: string, token: string, platform: 'ios' | 'android'): void {
    if (!this.deviceTokens.has(userId)) {
      this.deviceTokens.set(userId, []);
    }
    
    const devices = this.deviceTokens.get(userId)!;
    
    // Check if token already exists
    const existingIndex = devices.findIndex(d => d.token === token);
    if (existingIndex === -1) {
      devices.push({ token, platform });
      console.log(`📱 Registered ${platform} device for user ${userId}`);
    }
  }

  // Unregister device token
  unregisterDevice(userId: string, token: string): void {
    if (this.deviceTokens.has(userId)) {
      const devices = this.deviceTokens.get(userId)!;
      const index = devices.findIndex(d => d.token === token);
      if (index !== -1) {
        devices.splice(index, 1);
        console.log(`📱 Unregistered device for user ${userId}`);
      }
    }
  }

  // Get user's device tokens
  getUserDevices(userId: string): { token: string; platform: 'ios' | 'android' }[] {
    return this.deviceTokens.get(userId) || [];
  }

  // Send push notification to a user and save to database
  async sendToUser(userId: string, payload: PushPayload): Promise<boolean> {
    // Always save notification to database for polling
    try {
      const notification = new this.notificationModel({
        userId: new Types.ObjectId(userId),
        type: payload.type || NotificationType.BOOKING_CREATED,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        bookingId: payload.data?.bookingId ? new Types.ObjectId(payload.data.bookingId) : undefined,
        isRead: false,
        isSent: false,
      });
      await notification.save();
      console.log(`💾 Notification saved to database for user ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to save notification to database:`, error);
    }

    // Try to send push notification
    const devices = this.getUserDevices(userId);
    
    if (devices.length === 0) {
      console.log(`⚠️ No devices registered for user ${userId}`);
      console.log(`📬 Would send notification to ${userId}:`, payload);
      return false;
    }

    let success = false;
    for (const device of devices) {
      try {
        if (device.platform === 'ios') {
          await this.sendAPNs(device.token, payload);
          success = true;
        } else {
          console.log(`📱 Android push not implemented yet`);
        }
      } catch (error) {
        console.error(`❌ Failed to send push to ${device.platform}:`, error);
      }
    }

    return success;
  }

  // Send APNs notification
  private async sendAPNs(deviceToken: string, payload: PushPayload): Promise<void> {
    // If no APNs key, simulate the notification
    if (!this.apnsKey) {
      console.log(`📱 [SIMULATED APNs] To: ${deviceToken.substring(0, 20)}...`);
      console.log(`   Title: ${payload.title}`);
      console.log(`   Body: ${payload.body}`);
      return;
    }

    const token = this.getAPNsToken();
    const apnsPayload = {
      aps: {
        alert: {
          title: payload.title,
          body: payload.body,
        },
        badge: payload.badge || 1,
        sound: payload.sound || 'default',
        'mutable-content': 1,
      },
      ...payload.data,
    };

    const options = {
      hostname: process.env.NODE_ENV === 'production' 
        ? 'api.push.apple.com' 
        : 'api.sandbox.push.apple.com',
      port: 443,
      path: `/3/device/${deviceToken}`,
      method: 'POST',
      headers: {
        'authorization': `bearer ${token}`,
        'apns-topic': this.apnsBundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'content-type': 'application/json',
      },
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✅ APNs notification sent successfully`);
            resolve();
          } else {
            console.error(`❌ APNs error: ${res.statusCode} - ${data}`);
            reject(new Error(`APNs error: ${res.statusCode}`));
          }
        });
      });

      req.on('error', reject);
      req.write(JSON.stringify(apnsPayload));
      req.end();
    });
  }

  // Generate APNs JWT token
  private getAPNsToken(): string {
    const now = Math.floor(Date.now() / 1000);
    
    // Reuse token if not expired (tokens are valid for 1 hour)
    if (this.apnsToken && this.apnsTokenExpiry > now + 60) {
      return this.apnsToken;
    }

    if (!this.apnsKey) {
      throw new Error('APNs key not configured');
    }

    this.apnsToken = jwt.sign(
      {
        iss: this.apnsTeamId,
        iat: now,
      },
      this.apnsKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: this.apnsKeyId,
        },
      }
    );
    
    this.apnsTokenExpiry = now + 3600; // 1 hour
    return this.apnsToken;
  }

  // Helper methods for specific notification types
  
  async notifyNewBooking(workerId: string, customerName: string, serviceType: string, bookingId: string): Promise<void> {
    await this.sendToUser(workerId, {
      title: '🔔 Nouvelle demande de réservation',
      body: `${customerName} demande un service de ${serviceType}`,
      type: NotificationType.BOOKING_CREATED,
      data: { bookingId },
    });
  }

  async notifyBookingAccepted(customerId: string, workerName: string, bookingId: string): Promise<void> {
    await this.sendToUser(customerId, {
      title: '✅ Réservation acceptée',
      body: `${workerName} a accepté votre demande`,
      type: NotificationType.BOOKING_CONFIRMED,
      data: { bookingId },
    });
  }

  async notifyBookingRejected(customerId: string, workerName: string, bookingId: string): Promise<void> {
    await this.sendToUser(customerId, {
      title: '❌ Réservation refusée',
      body: `${workerName} n'est pas disponible`,
      type: NotificationType.BOOKING_REJECTED,
      data: { bookingId },
    });
  }

  async notifyBookingCancelled(userId: string, cancelledByName: string, bookingId: string): Promise<void> {
    await this.sendToUser(userId, {
      title: '🚫 Réservation annulée',
      body: `La réservation a été annulée par ${cancelledByName}`,
      type: NotificationType.BOOKING_CANCELLED,
      data: { bookingId },
    });
  }

  async notifyWorkerOnTheWay(customerId: string, workerName: string, bookingId: string): Promise<void> {
    await this.sendToUser(customerId, {
      title: '🚗 Technicien en route',
      body: `${workerName} est en chemin vers vous`,
      type: NotificationType.WORKER_ON_THE_WAY,
      data: { bookingId },
    });
  }

  async notifyJobStarted(customerId: string, workerName: string, bookingId: string): Promise<void> {
    await this.sendToUser(customerId, {
      title: '🔧 Travail commencé',
      body: `${workerName} a commencé le travail`,
      type: NotificationType.JOB_STARTED,
      data: { bookingId },
    });
  }

  async notifyWorkFinished(customerId: string, workerName: string, bookingId: string, amount: number): Promise<void> {
    await this.sendToUser(customerId, {
      title: '🔧 Travail terminé - Paiement requis',
      body: `${workerName} a terminé le travail. Montant à payer: ${amount} TND`,
      type: NotificationType.WORK_FINISHED,
      data: { bookingId, amount },
    });
  }

  async notifyJobCompleted(customerId: string, workerName: string, bookingId: string): Promise<void> {
    await this.sendToUser(customerId, {
      title: '✅ Réservation complétée',
      body: `Merci pour votre paiement! N'oubliez pas de laisser un avis pour ${workerName}`,
      type: NotificationType.JOB_COMPLETED,
      data: { bookingId },
    });
  }

  async notifyNewMessage(receiverId: string, senderName: string, bookingId: string): Promise<void> {
    await this.sendToUser(receiverId, {
      title: '💬 Nouveau message',
      body: `${senderName} vous a envoyé un message`,
      type: NotificationType.NEW_MESSAGE,
      data: { bookingId },
    });
  }

  async notifyPaymentReceived(workerId: string, amount: number, bookingId: string): Promise<void> {
    await this.sendToUser(workerId, {
      title: '💰 Paiement reçu',
      body: `Vous avez reçu ${amount} TND`,
      type: NotificationType.PAYMENT_RECEIVED,
      data: { bookingId },
    });
  }
}
