import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from '../schemas/notification.schema';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class NotificationsService {
  // Store FCM tokens in memory (in production, use Redis or database)
  private userTokens: Map<string, Set<string>> = new Map(); // userId -> Set of FCM tokens

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Register device token
  registerDevice(userId: string, fcmToken: string, platform: string): void {
    if (!this.userTokens.has(userId)) {
      this.userTokens.set(userId, new Set());
    }
    this.userTokens.get(userId)!.add(fcmToken);
    console.log(`✅ Registered device for user ${userId}: ${platform}`);
  }

  // Unregister device token
  unregisterDevice(userId: string, fcmToken: string): void {
    if (this.userTokens.has(userId)) {
      this.userTokens.get(userId)!.delete(fcmToken);
      if (this.userTokens.get(userId)!.size === 0) {
        this.userTokens.delete(userId);
      }
    }
    console.log(`✅ Unregistered device for user ${userId}`);
  }

  // Get user's FCM tokens
  getUserTokens(userId: string): string[] {
    return Array.from(this.userTokens.get(userId) || []);
  }

  // Create notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    data?: any,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      userId: new Types.ObjectId(userId),
      type,
      title,
      body,
      data: data || {},
      bookingId: data?.bookingId ? new Types.ObjectId(data.bookingId) : undefined,
      messageId: data?.messageId ? new Types.ObjectId(data.messageId) : undefined,
      reviewId: data?.reviewId ? new Types.ObjectId(data.reviewId) : undefined,
    });

    return notification.save();
  }

  // Get user notifications
  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('bookingId')
      .exec();
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationModel.findById(notificationId).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.userId.equals(new Types.ObjectId(userId))) {
      throw new NotFoundException('Notification not found');
    }

    const updatedNotification = await this.notificationModel
      .findByIdAndUpdate(
        notificationId,
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .exec();

    if (!updatedNotification) {
      throw new NotFoundException('Notification not found');
    }

    return updatedNotification;
  }

  // Mark all notifications as read
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true, readAt: new Date() },
    ).exec();
  }

  // Get unread count
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    }).exec();
  }

  // Delete notification
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Notification not found');
    }
  }

  // Helper methods for creating specific notifications

  async notifyBookingCreated(workerId: string, bookingId: string, customerName: string): Promise<void> {
    await this.createNotification(
      workerId,
      NotificationType.BOOKING_CREATED,
      'New Booking Request',
      `${customerName} has requested your service`,
      { bookingId },
    );
  }

  async notifyBookingConfirmed(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.BOOKING_CONFIRMED,
      'Booking Confirmed',
      `${workerName} has accepted your booking`,
      { bookingId },
    );
  }

  async notifyBookingRejected(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.BOOKING_REJECTED,
      'Booking Rejected',
      `${workerName} has declined your booking`,
      { bookingId },
    );
  }

  async notifyBookingCancelled(userId: string, bookingId: string, cancelledBy: string): Promise<void> {
    await this.createNotification(
      userId,
      NotificationType.BOOKING_CANCELLED,
      'Booking Cancelled',
      `Your booking has been cancelled by ${cancelledBy}`,
      { bookingId },
    );
  }

  async notifyWorkerOnTheWay(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.WORKER_ON_THE_WAY,
      'Worker On The Way',
      `${workerName} is on the way to your location`,
      { bookingId },
    );
  }

  async notifyJobStarted(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.JOB_STARTED,
      'Job Started',
      `${workerName} has started working on your job`,
      { bookingId },
    );
  }

  async notifyJobCompleted(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.JOB_COMPLETED,
      'Job Completed',
      `${workerName} has completed the job. Please review and make payment.`,
      { bookingId },
    );
  }

  async notifyPaymentReceived(workerId: string, bookingId: string, amount: number): Promise<void> {
    await this.createNotification(
      workerId,
      NotificationType.PAYMENT_RECEIVED,
      'Payment Received',
      `You received ${amount} TND for your service`,
      { bookingId },
    );
  }

  async notifyNewMessage(receiverId: string, messageId: string, senderName: string): Promise<void> {
    await this.createNotification(
      receiverId,
      NotificationType.NEW_MESSAGE,
      'New Message',
      `${senderName} sent you a message`,
      { messageId },
    );
  }

  async notifyNewReview(workerId: string, reviewId: string, rating: number): Promise<void> {
    await this.createNotification(
      workerId,
      NotificationType.NEW_REVIEW,
      'New Review',
      `You received a ${rating}-star review`,
      { reviewId },
    );
  }

  async notifyReviewReminder(customerId: string, bookingId: string, workerName: string): Promise<void> {
    await this.createNotification(
      customerId,
      NotificationType.REVIEW_REMINDER,
      'Review Reminder',
      `Don't forget to review ${workerName}`,
      { bookingId },
    );
  }
}
