import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto, CheckAvailabilityDto } from './dto/availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Worker blocks a time slot
  @Post('block')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Block a time slot (worker only)' })
  @ApiResponse({ status: 201, description: 'Time slot blocked successfully' })
  async blockTimeSlot(@GetUser() user: any, @Body() dto: CreateAvailabilityDto) {
    try {
      const availability = await this.availabilityService.blockTimeSlot(user.userId, dto);
      return {
        success: true,
        message: 'Time slot blocked successfully',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // Worker unblocks a time slot
  @Delete('block/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unblock a time slot (worker only)' })
  @ApiResponse({ status: 200, description: 'Time slot unblocked successfully' })
  async unblockTimeSlot(@GetUser() user: any, @Param('id') id: string) {
    try {
      await this.availabilityService.unblockTimeSlot(user.userId, id);
      return {
        success: true,
        message: 'Time slot unblocked successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // Get worker's availability (blocked slots + bookings)
  @Get('worker/:workerId')
  @ApiOperation({ summary: 'Get worker availability for date range' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-12-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-12-31' })
  @ApiResponse({ status: 200, description: 'Availability retrieved successfully' })
  async getWorkerAvailability(
    @Param('workerId') workerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const availability = await this.availabilityService.getWorkerAvailability(workerId, startDate, endDate);
      return {
        success: true,
        message: 'Availability retrieved successfully',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // Get my availability (for authenticated worker)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my availability (worker)' })
  @ApiQuery({ name: 'startDate', required: true, example: '2025-12-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2025-12-31' })
  async getMyAvailability(
    @GetUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    try {
      const availability = await this.availabilityService.getWorkerAvailability(user.userId, startDate, endDate);
      return {
        success: true,
        message: 'Availability retrieved successfully',
        data: availability,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // Check if a specific time slot is available
  @Post('check')
  @ApiOperation({ summary: 'Check if a time slot is available' })
  @ApiResponse({ status: 200, description: 'Availability check completed' })
  async checkAvailability(@Body() dto: CheckAvailabilityDto) {
    try {
      const result = await this.availabilityService.checkAvailability(dto);
      return {
        success: true,
        message: result.available ? 'Time slot is available' : result.reason,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // Get available time slots for a worker on a specific date
  @Get('slots/:workerId')
  @ApiOperation({ summary: 'Get available time slots for a worker on a date' })
  @ApiQuery({ name: 'date', required: true, example: '2025-12-10' })
  @ApiResponse({ status: 200, description: 'Available slots retrieved successfully' })
  async getAvailableSlots(
    @Param('workerId') workerId: string,
    @Query('date') date: string,
  ) {
    try {
      const slots = await this.availabilityService.getAvailableSlots(workerId, date);
      return {
        success: true,
        message: 'Available slots retrieved successfully',
        data: { availableSlots: slots },
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
