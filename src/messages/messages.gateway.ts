import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(private readonly messagesService: MessagesService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    // Get userId from handshake query
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
      console.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    
    // Remove user from map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  }

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @MessageBody() data: { userId: string; message: SendMessageDto },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Save message to database
      const message = await this.messagesService.sendMessage(data.userId, data.message);

      // Send to receiver if online
      const receiverSocketId = this.userSockets.get(data.message.receiverId);
      if (receiverSocketId) {
        this.server.to(receiverSocketId).emit('message:received', message);
      }

      // Confirm to sender
      client.emit('message:sent', message);

      return { success: true, data: message };
    } catch (error) {
      client.emit('message:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @MessageBody() data: { userId: string; messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const message = await this.messagesService.markAsRead(data.messageId, data.userId);

      // Notify sender that message was read
      const senderSocketId = this.userSockets.get(message.senderId._id.toString());
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message:read', {
          messageId: data.messageId,
          readAt: message.readAt,
        });
      }

      return { success: true, data: message };
    } catch (error) {
      client.emit('message:error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(
    @MessageBody() data: { userId: string; bookingId: string; receiverId: string },
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('typing:start', {
        userId: data.userId,
        bookingId: data.bookingId,
      });
    }
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(
    @MessageBody() data: { userId: string, bookingId: string; receiverId: string },
  ) {
    const receiverSocketId = this.userSockets.get(data.receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('typing:stop', {
        userId: data.userId,
        bookingId: data.bookingId,
      });
    }
  }

  @SubscribeMessage('join:booking')
  handleJoinBooking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`booking:${data.bookingId}`);
    console.log(`Client ${client.id} joined booking ${data.bookingId}`);
  }

  @SubscribeMessage('leave:booking')
  handleLeaveBooking(
    @MessageBody() data: { bookingId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`booking:${data.bookingId}`);
    console.log(`Client ${client.id} left booking ${data.bookingId}`);
  }

  // Helper method to send notification to user
  sendNotificationToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
