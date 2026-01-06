import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { BookingStatus } from '../schemas/booking.schema';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved successfully' })
  async getDashboardStats() {
    try {
      const stats = await this.adminService.getDashboardStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.adminService.getAllUsers(
        page || 1,
        limit || 50,
        role,
        search,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('workers')
  @ApiOperation({ summary: 'Get all workers with stats' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getAllWorkers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.adminService.getAllWorkers(
        page || 1,
        limit || 50,
        category,
        search,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAllBookings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.adminService.getAllBookings(
        page || 1,
        limit || 50,
        status,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('bookings/stats')
  @ApiOperation({ summary: 'Get booking statistics by status' })
  async getBookingStats() {
    try {
      const stats = await this.adminService.getBookingStats();
      return { success: true, data: stats };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get all reviews with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'rating', required: false, type: Number })
  async getAllReviews(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('rating') rating?: number,
  ) {
    try {
      const result = await this.adminService.getAllReviews(
        page || 1,
        limit || 50,
        rating,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Put('users/:userId/status')
  @ApiOperation({ summary: 'Update user active status' })
  @ApiBody({ schema: { type: 'object', properties: { isActive: { type: 'boolean' } } } })
  async updateUserStatus(
    @Param('userId') userId: string,
    @Body() body: { isActive: boolean },
  ) {
    try {
      const user = await this.adminService.updateUserStatus(userId, body.isActive);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Put('bookings/:bookingId/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' } } } })
  async updateBookingStatus(
    @Param('bookingId') bookingId: string,
    @Body() body: { status: BookingStatus },
  ) {
    try {
      const booking = await this.adminService.updateBookingStatus(bookingId, body.status);
      return { success: true, data: booking };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('top-workers')
  @ApiOperation({ summary: 'Get top rated workers' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopWorkers(@Query('limit') limit?: number) {
    try {
      const workers = await this.adminService.getTopWorkers(limit || 5);
      return { success: true, data: workers };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('charts/bookings')
  @ApiOperation({ summary: 'Get bookings chart data' })
  @ApiQuery({ name: 'months', required: false, type: Number })
  async getBookingsChartData(@Query('months') months?: number) {
    try {
      const data = await this.adminService.getBookingsChartData(months || 7);
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('charts/services')
  @ApiOperation({ summary: 'Get service distribution chart data' })
  async getServiceDistribution() {
    try {
      const data = await this.adminService.getServiceDistribution();
      return { success: true, data };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // ==================== KYC MANAGEMENT ====================

  @Get('kyc/pending')
  @ApiOperation({ summary: 'Get pending KYC verifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPendingKycVerifications(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.adminService.getPendingKycVerifications(
        page || 1,
        limit || 50,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('kyc')
  @ApiOperation({ summary: 'Get all KYC submissions' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getAllKycSubmissions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    try {
      const result = await this.adminService.getAllKycSubmissions(
        page || 1,
        limit || 50,
        status,
      );
      return { success: true, data: result };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Get('kyc/:userId')
  @ApiOperation({ summary: 'Get KYC details for a user' })
  async getKycDetails(@Param('userId') userId: string) {
    try {
      const user = await this.adminService.getKycDetails(userId);
      return { success: true, data: user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Patch('kyc/:userId/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve KYC verification' })
  async approveKyc(
    @Param('userId') userId: string,
    @Body() body: { adminId?: string },
  ) {
    try {
      const adminId = body.adminId || 'admin';
      const result = await this.adminService.approveKyc(userId, adminId);
      return { success: true, message: result.message, data: result.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  @Patch('kyc/:userId/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject KYC verification' })
  @ApiBody({ schema: { type: 'object', properties: { reason: { type: 'string' }, adminId: { type: 'string' } } } })
  async rejectKyc(
    @Param('userId') userId: string,
    @Body() body: { reason: string; adminId?: string },
  ) {
    try {
      const adminId = body.adminId || 'admin';
      const result = await this.adminService.rejectKyc(userId, adminId, body.reason);
      return { success: true, message: result.message, data: result.user };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}
