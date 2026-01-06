import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { TrackingService } from './tracking.service';

@ApiTags('Tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  @Post('start/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Start tracking for a booking (worker)' })
  @ApiResponse({ status: 200, description: 'Tracking started' })
  async startTracking(
    @GetUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    try {
      await this.trackingService.startTracking(userId, bookingId);
      return {
        success: true,
        message: 'Tracking started',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post('update/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update worker location' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @GetUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
    @Body() body: { latitude: number; longitude: number; heading?: number; speed?: number },
  ) {
    try {
      await this.trackingService.updateLocation(userId, bookingId, body);
      return {
        success: true,
        message: 'Location updated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete('stop/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Stop tracking for a booking (worker)' })
  @ApiResponse({ status: 200, description: 'Tracking stopped' })
  async stopTracking(
    @GetUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    try {
      await this.trackingService.stopTracking(userId, bookingId);
      return {
        success: true,
        message: 'Tracking stopped',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('location/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get worker location for a booking (customer)' })
  @ApiResponse({ status: 200, description: 'Worker location' })
  async getLocation(
    @GetUser('userId') userId: string,
    @Param('bookingId') bookingId: string,
  ) {
    try {
      const location = await this.trackingService.getLocation(bookingId);
      return {
        success: true,
        message: 'Location retrieved',
        data: location,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: null,
      };
    }
  }

  // ============================================
  // SIMULATION ENDPOINTS (for testing only)
  // ============================================

  @Post('simulate/start/:bookingId')
  @ApiOperation({ summary: '[TEST] Start simulated tracking - worker moves toward destination' })
  @ApiQuery({ name: 'workerLat', required: true, description: 'Worker starting latitude' })
  @ApiQuery({ name: 'workerLng', required: true, description: 'Worker starting longitude' })
  @ApiQuery({ name: 'destLat', required: true, description: 'Destination latitude' })
  @ApiQuery({ name: 'destLng', required: true, description: 'Destination longitude' })
  async startSimulation(
    @Param('bookingId') bookingId: string,
    @Query('workerLat') workerLat: string,
    @Query('workerLng') workerLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
    try {
      await this.trackingService.startSimulation(
        bookingId,
        parseFloat(workerLat),
        parseFloat(workerLng),
        parseFloat(destLat),
        parseFloat(destLng),
      );
      return {
        success: true,
        message: 'Simulation started - worker will move toward destination',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete('simulate/stop/:bookingId')
  @ApiOperation({ summary: '[TEST] Stop simulated tracking' })
  async stopSimulation(@Param('bookingId') bookingId: string) {
    try {
      await this.trackingService.stopSimulation(bookingId);
      return {
        success: true,
        message: 'Simulation stopped',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
