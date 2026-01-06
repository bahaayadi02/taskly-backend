import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async sendMessage(@GetUser() user: any, @Body() sendMessageDto: SendMessageDto) {
    try {
      const message = await this.messagesService.sendMessage(user.userId, sendMessageDto);
      return {
        success: true,
        message: 'Message sent successfully',
        data: message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get conversation for a booking' })
  @ApiResponse({ status: 200, description: 'Conversation retrieved successfully' })
  async getConversation(@Param('bookingId') bookingId: string, @GetUser() user: any) {
    try {
      const messages = await this.messagesService.getConversation(bookingId, user.userId);
      return {
        success: true,
        message: 'Conversation retrieved successfully',
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiResponse({ status: 200, description: 'Message marked as read' })
  async markAsRead(@Param('id') id: string, @GetUser() user: any) {
    try {
      const message = await this.messagesService.markAsRead(id, user.userId);
      return {
        success: true,
        message: 'Message marked as read',
        data: message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Patch('booking/:bookingId/read-all')
  @ApiOperation({ summary: 'Mark all messages in conversation as read' })
  @ApiResponse({ status: 200, description: 'All messages marked as read' })
  async markConversationAsRead(@Param('bookingId') bookingId: string, @GetUser() user: any) {
    try {
      await this.messagesService.markConversationAsRead(bookingId, user.userId);
      return {
        success: true,
        message: 'All messages marked as read',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread message count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@GetUser() user: any) {
    try {
      const count = await this.messagesService.getUnreadCount(user.userId);
      return {
        success: true,
        message: 'Unread count retrieved successfully',
        data: { count },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('unread/by-booking')
  @ApiOperation({ summary: 'Get unread count per booking' })
  @ApiResponse({ status: 200, description: 'Unread counts retrieved successfully' })
  async getUnreadCountByBooking(@GetUser() user: any) {
    try {
      const counts = await this.messagesService.getUnreadCountByBooking(user.userId);
      return {
        success: true,
        message: 'Unread counts retrieved successfully',
        data: counts,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('id') id: string, @GetUser() user: any) {
    try {
      await this.messagesService.deleteMessage(id, user.userId);
      return {
        success: true,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }
}
