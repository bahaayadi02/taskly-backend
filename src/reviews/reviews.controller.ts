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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto, WorkerResponseDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a review' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'Review already exists' })
  async create(@GetUser() user: any, @Body() createReviewDto: CreateReviewDto) {
    try {
      const review = await this.reviewsService.create(user.userId, createReviewDto);
      return {
        success: true,
        message: 'Review created successfully',
        data: review,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('worker/:workerId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a general review for a worker' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createWorkerReview(
    @GetUser() user: any,
    @Param('workerId') workerId: string,
    @Body() body: { rating: number; comment?: string },
  ) {
    try {
      const review = await this.reviewsService.createWorkerReview(
        user.userId,
        workerId,
        body.rating,
        body.comment,
      );
      return {
        success: true,
        message: 'Review created successfully',
        data: review,
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
  @ApiOperation({ summary: 'Get all reviews for a worker' })
  @ApiResponse({ status: 200, description: 'Reviews retrieved successfully' })
  async getWorkerReviews(@Param('workerId') workerId: string) {
    try {
      const reviews = await this.reviewsService.getWorkerReviews(workerId);
      return {
        success: true,
        message: 'Reviews retrieved successfully',
        data: reviews,
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
  @ApiOperation({ summary: 'Get review for a booking' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  async getBookingReview(@Param('bookingId') bookingId: string) {
    try {
      const review = await this.reviewsService.getBookingReview(bookingId);
      return {
        success: true,
        message: review ? 'Review retrieved successfully' : 'No review found',
        data: review,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('stats/:workerId')
  @ApiOperation({ summary: 'Get worker rating statistics' })
  @ApiResponse({ status: 200, description: 'Stats retrieved successfully' })
  async getWorkerStats(@Param('workerId') workerId: string) {
    try {
      const stats = await this.reviewsService.getWorkerStats(workerId);
      return {
        success: true,
        message: 'Stats retrieved successfully',
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    try {
      const review = await this.reviewsService.update(id, user.userId, updateReviewDto);
      return {
        success: true,
        message: 'Review updated successfully',
        data: review,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post(':id/respond')
  @ApiOperation({ summary: 'Worker responds to review' })
  @ApiResponse({ status: 200, description: 'Response added successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async respondToReview(
    @Param('id') id: string,
    @GetUser() user: any,
    @Body() responseDto: WorkerResponseDto,
  ) {
    try {
      const review = await this.reviewsService.respondToReview(id, user.userId, responseDto);
      return {
        success: true,
        message: 'Response added successfully',
        data: review,
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
  @ApiOperation({ summary: 'Delete review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete review after 24 hours' })
  async delete(@Param('id') id: string, @GetUser() user: any) {
    try {
      await this.reviewsService.delete(id, user.userId);
      return {
        success: true,
        message: 'Review deleted successfully',
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
