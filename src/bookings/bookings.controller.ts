import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ProcessPaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { BookingStatus } from '../schemas/booking.schema';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({ status: 201, description: 'Booking created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@GetUser() user: any, @Body() createBookingDto: CreateBookingDto) {
    try {
      const booking = await this.bookingsService.create(user.userId, createBookingDto);
      return {
        success: true,
        message: 'Booking created successfully',
        data: booking,
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
  @ApiOperation({ summary: 'Get all bookings for the authenticated user' })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  @ApiResponse({ status: 200, description: 'Bookings retrieved successfully' })
  async findAll(@GetUser() user: any, @Query('status') status?: BookingStatus) {
    try {
      const bookings = await this.bookingsService.findAll(user.userId, user.role, status);
      return {
        success: true,
        message: 'Bookings retrieved successfully',
        data: bookings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findOne(@Param('id') id: string, @GetUser() user: any) {
    try {
      const booking = await this.bookingsService.findOne(id, user.userId);
      return {
        success: true,
        message: 'Booking retrieved successfully',
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update booking status' })
  @ApiResponse({ status: 200, description: 'Booking status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() updateStatusDto: UpdateBookingStatusDto,
  ) {
    try {
      const booking = await this.bookingsService.updateStatus(id, user.userId, updateStatusDto);
      return {
        success: true,
        message: 'Booking status updated successfully',
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Patch(':id/payment')
  @ApiOperation({ summary: 'Process payment for booking' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async processPayment(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() paymentDto: ProcessPaymentDto,
  ) {
    try {
      const booking = await this.bookingsService.processPayment(id, user.userId, paymentDto);
      return {
        success: true,
        message: 'Payment processed successfully',
        data: booking,
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
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Cannot cancel booking' })
  async cancel(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body('reason') reason: string,
  ) {
    try {
      const booking = await this.bookingsService.cancel(id, user.userId, reason);
      return {
        success: true,
        message: 'Booking cancelled successfully',
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get customer bookings' })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  async getCustomerBookings(
    @Param('customerId') customerId: string,
    @Query('status') status?: BookingStatus,
  ) {
    try {
      const bookings = await this.bookingsService.getCustomerBookings(customerId, status);
      return {
        success: true,
        message: 'Customer bookings retrieved successfully',
        data: bookings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('worker/:workerId')
  @ApiOperation({ summary: 'Get worker bookings' })
  @ApiQuery({ name: 'status', required: false, enum: BookingStatus })
  async getWorkerBookings(
    @Param('workerId') workerId: string,
    @Query('status') status?: BookingStatus,
  ) {
    try {
      const bookings = await this.bookingsService.getWorkerBookings(workerId, status);
      return {
        success: true,
        message: 'Worker bookings retrieved successfully',
        data: bookings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('worker/:workerId/stats')
  @ApiOperation({ summary: 'Get worker booking statistics' })
  async getWorkerStats(@Param('workerId') workerId: string) {
    try {
      const stats = await this.bookingsService.getWorkerStats(workerId);
      return {
        success: true,
        message: 'Worker stats retrieved successfully',
        data: stats,
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
