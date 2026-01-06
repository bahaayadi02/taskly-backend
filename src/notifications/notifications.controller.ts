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
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushService: PushNotificationService,
  ) {}

  @Post('register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered successfully' })
  registerDevice(@GetUser() user: any, @Body() registerDeviceDto: RegisterDeviceDto) {
    try {
      // Register with both services
      this.notificationsService.registerDevice(
        user.userId,
        registerDeviceDto.fcmToken,
        registerDeviceDto.platform,
      );
      
      // Register with push notification service
      this.pushService.registerDevice(
        user.userId,
        registerDeviceDto.fcmToken,
        registerDeviceDto.platform === 'ios' ? 'ios' : 'android',
      );
      
      return {
        success: true,
        message: 'Device registered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Delete('device/:token')
  @ApiOperation({ summary: 'Unregister device' })
  @ApiResponse({ status: 200, description: 'Device unregistered successfully' })
  unregisterDevice(@GetUser() user: any, @Param('token') token: string) {
    try {
      this.notificationsService.unregisterDevice(user.userId, token);
      return {
        success: true,
        message: 'Device unregistered successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
  async getUserNotifications(@GetUser() user: any, @Query('limit') limit?: number) {
    try {
      const notifications = await this.notificationsService.getUserNotifications(
        user.userId,
        limit ? parseInt(limit.toString()) : 50,
      );
      return {
        success: true,
        message: 'Notifications retrieved successfully',
        data: notifications,
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
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(@Param('id') id: string, @GetUser() user: any) {
    try {
      const notification = await this.notificationsService.markAsRead(id, user.userId);
      return {
        success: true,
        message: 'Notification marked as read',
        data: notification,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@GetUser() user: any) {
    try {
      await this.notificationsService.markAllAsRead(user.userId);
      return {
        success: true,
        message: 'All notifications marked as read',
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
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved successfully' })
  async getUnreadCount(@GetUser() user: any) {
    try {
      const count = await this.notificationsService.getUnreadCount(user.userId);
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

  @Delete(':id')
  @ApiOperation({ summary: 'Delete notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
  async deleteNotification(@Param('id') id: string, @GetUser() user: any) {
    try {
      await this.notificationsService.deleteNotification(id, user.userId);
      return {
        success: true,
        message: 'Notification deleted successfully',
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
