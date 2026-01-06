import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { Booking, BookingDocument, BookingStatus, PaymentStatus } from '../schemas/booking.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto, WorkerResponseDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  // Create a new review
  async create(customerId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    // Check if booking exists and belongs to customer
    const booking = await this.bookingModel.findById(createReviewDto.bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!booking.customerId.equals(new Types.ObjectId(customerId))) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    // Booking must be completed and paid
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can only review completed bookings');
    }

    if (booking.paymentStatus !== PaymentStatus.PAID) {
      throw new BadRequestException('You can only review paid bookings');
    }

    // Check if review already exists
    const existingReview = await this.reviewModel.findOne({ bookingId: booking._id }).exec();
    if (existingReview) {
      throw new ConflictException('You have already reviewed this booking');
    }

    const review = new this.reviewModel({
      bookingId: booking._id,
      customerId: new Types.ObjectId(customerId),
      workerId: booking.workerId,
      rating: createReviewDto.rating,
      comment: createReviewDto.comment,
      photos: createReviewDto.photos || [],
    });

    const savedReview = await review.save();

    // Populate customer and worker details
    const populatedReview = await this.reviewModel
      .findById(savedReview._id)
      .populate('customerId', 'fullName profilePicture')
      .populate('workerId', 'fullName profilePicture')
      .populate('bookingId')
      .exec();

    if (!populatedReview) {
      throw new NotFoundException('Review not found after creation');
    }

    return populatedReview;
  }

  // Create a general review for a worker (without booking requirement)
  async createWorkerReview(
    customerId: string,
    workerId: string,
    rating: number,
    comment?: string,
  ): Promise<Review> {
    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const review = new this.reviewModel({
      customerId: new Types.ObjectId(customerId),
      workerId: new Types.ObjectId(workerId),
      rating,
      comment: comment || '',
      photos: [],
    });

    const savedReview = await review.save();

    // Populate customer details
    const populatedReview = await this.reviewModel
      .findById(savedReview._id)
      .populate('customerId', 'fullName profilePicture')
      .populate('workerId', 'fullName profilePicture')
      .exec();

    if (!populatedReview) {
      throw new NotFoundException('Review not found after creation');
    }

    return populatedReview;
  }

  // Get all reviews for a worker
  async getWorkerReviews(workerId: string): Promise<Review[]> {
    return this.reviewModel
      .find({ workerId: new Types.ObjectId(workerId) })
      .populate('customerId', 'fullName profilePicture')
      .populate('bookingId', 'serviceType scheduledDate')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get review for a specific booking
  async getBookingReview(bookingId: string): Promise<Review | null> {
    return this.reviewModel
      .findOne({ bookingId: new Types.ObjectId(bookingId) })
      .populate('customerId', 'fullName profilePicture')
      .populate('workerId', 'fullName profilePicture')
      .exec();
  }

  // Update review
  async update(
    reviewId: string,
    customerId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId).exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (!review.customerId.equals(new Types.ObjectId(customerId))) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updateData: any = {
      isEdited: true,
      editedAt: new Date(),
    };

    if (updateReviewDto.rating !== undefined) {
      updateData.rating = updateReviewDto.rating;
    }

    if (updateReviewDto.comment !== undefined) {
      updateData.comment = updateReviewDto.comment;
    }

    if (updateReviewDto.photos !== undefined) {
      updateData.photos = updateReviewDto.photos;
    }

    const updatedReview = await this.reviewModel
      .findByIdAndUpdate(reviewId, updateData, { new: true })
      .populate('customerId', 'fullName profilePicture')
      .populate('workerId', 'fullName profilePicture')
      .populate('bookingId')
      .exec();

    if (!updatedReview) {
      throw new NotFoundException('Review not found');
    }

    return updatedReview;
  }

  // Worker responds to review
  async respondToReview(
    reviewId: string,
    workerId: string,
    responseDto: WorkerResponseDto,
  ): Promise<Review> {
    const review = await this.reviewModel.findById(reviewId).exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (!review.workerId.equals(new Types.ObjectId(workerId))) {
      throw new ForbiddenException('You can only respond to reviews about you');
    }

    const updatedReview = await this.reviewModel
      .findByIdAndUpdate(
        reviewId,
        {
          workerResponse: responseDto.response,
          workerRespondedAt: new Date(),
        },
        { new: true },
      )
      .populate('customerId', 'fullName profilePicture')
      .populate('workerId', 'fullName profilePicture')
      .populate('bookingId')
      .exec();

    if (!updatedReview) {
      throw new NotFoundException('Review not found');
    }

    return updatedReview;
  }

  // Get worker rating statistics
  async getWorkerStats(workerId: string): Promise<any> {
    const reviews = await this.reviewModel
      .find({ workerId: new Types.ObjectId(workerId) })
      .exec();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: reviews.length,
      ratingDistribution,
    };
  }

  // Delete review (admin only or within 24 hours)
  async delete(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewModel.findById(reviewId).exec();

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (!review.customerId.equals(new Types.ObjectId(userId))) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    // Check if within 24 hours
    const hoursSinceCreation = (Date.now() - review.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) {
      throw new BadRequestException('You can only delete reviews within 24 hours of creation');
    }

    await this.reviewModel.findByIdAndDelete(reviewId).exec();
  }
}
