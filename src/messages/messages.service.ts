import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../schemas/message.schema';
import { Booking, BookingDocument } from '../schemas/booking.schema';
import { SendMessageDto } from './dto/send-message.dto';
import { PushNotificationService } from '../notifications/push-notification.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    private pushService: PushNotificationService,
  ) {}

  // Send a message
  async sendMessage(senderId: string, sendMessageDto: SendMessageDto): Promise<Message> {
    // Verify booking exists
    const booking = await this.bookingModel.findById(sendMessageDto.bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Verify sender is part of the booking
    const senderIdObj = new Types.ObjectId(senderId);
    const receiverIdObj = new Types.ObjectId(sendMessageDto.receiverId);

    if (!booking.customerId.equals(senderIdObj) && !booking.workerId.equals(senderIdObj)) {
      throw new ForbiddenException('You are not part of this booking');
    }

    // Verify receiver is part of the booking
    if (!booking.customerId.equals(receiverIdObj) && !booking.workerId.equals(receiverIdObj)) {
      throw new BadRequestException('Receiver is not part of this booking');
    }

    // Cannot send message to yourself
    if (senderIdObj.equals(receiverIdObj)) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    const message = new this.messageModel({
      bookingId: booking._id,
      senderId: senderIdObj,
      receiverId: receiverIdObj,
      type: sendMessageDto.type,
      content: sendMessageDto.content,
      attachments: sendMessageDto.attachments || [],
      latitude: sendMessageDto.latitude,
      longitude: sendMessageDto.longitude,
    });

    const savedMessage = await message.save();

    // Populate sender and receiver details
    const populatedMessage = await this.messageModel
      .findById(savedMessage._id)
      .populate('senderId', 'fullName profilePicture')
      .populate('receiverId', 'fullName profilePicture')
      .exec();

    if (!populatedMessage) {
      throw new NotFoundException('Message not found after creation');
    }

    // Send push notification to receiver
    const senderName = (populatedMessage.senderId as any).fullName || 'Quelqu\'un';
    await this.pushService.notifyNewMessage(
      sendMessageDto.receiverId,
      senderName,
      sendMessageDto.bookingId,
    );

    return populatedMessage;
  }

  // Get conversation for a booking
  async getConversation(bookingId: string, userId: string): Promise<Message[]> {
    // Verify booking exists and user has access
    const booking = await this.bookingModel.findById(bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const userIdObj = new Types.ObjectId(userId);
    if (!booking.customerId.equals(userIdObj) && !booking.workerId.equals(userIdObj)) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    return this.messageModel
      .find({ bookingId: new Types.ObjectId(bookingId) })
      .populate('senderId', 'fullName profilePicture')
      .populate('receiverId', 'fullName profilePicture')
      .sort({ createdAt: 1 }) // Oldest first
      .exec();
  }

  // Mark message as read
  async markAsRead(messageId: string, userId: string): Promise<Message> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only receiver can mark as read
    if (!message.receiverId.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('Only the receiver can mark message as read');
    }

    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(
        messageId,
        { isRead: true, readAt: new Date() },
        { new: true },
      )
      .populate('senderId', 'fullName profilePicture')
      .populate('receiverId', 'fullName profilePicture')
      .exec();

    if (!updatedMessage) {
      throw new NotFoundException('Message not found');
    }

    return updatedMessage;
  }

  // Mark all messages in a conversation as read
  async markConversationAsRead(bookingId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        bookingId: new Types.ObjectId(bookingId),
        receiverId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    ).exec();
  }

  // Get unread message count
  async getUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      receiverId: new Types.ObjectId(userId),
      isRead: false,
    }).exec();
  }

  // Get unread count per booking
  async getUnreadCountByBooking(userId: string): Promise<any[]> {
    return this.messageModel.aggregate([
      {
        $match: {
          receiverId: new Types.ObjectId(userId),
          isRead: false,
        },
      },
      {
        $group: {
          _id: '$bookingId',
          count: { $sum: 1 },
        },
      },
    ]).exec();
  }

  // Delete message (soft delete)
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender can delete
    if (!message.senderId.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('Only the sender can delete this message');
    }

    await this.messageModel.findByIdAndUpdate(messageId, {
      isDeleted: true,
      deletedAt: new Date(),
    }).exec();
  }
}
