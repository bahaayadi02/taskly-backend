import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument, BookingStatus, PaymentStatus } from '../schemas/booking.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { ProcessPaymentDto } from './dto/payment.dto';
import { AvailabilityService } from '../availability/availability.service';
import { PushNotificationService } from '../notifications/push-notification.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @Inject(forwardRef(() => AvailabilityService))
    private availabilityService: AvailabilityService,
    private pushService: PushNotificationService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
  ) {}

  // Create a new booking
  async create(customerId: string, createBookingDto: CreateBookingDto): Promise<Booking> {
    const booking = new this.bookingModel({
      customerId: new Types.ObjectId(customerId),
      workerId: new Types.ObjectId(createBookingDto.workerId),
      serviceType: createBookingDto.serviceType,
      scheduledDate: new Date(createBookingDto.scheduledDate),
      scheduledTime: createBookingDto.scheduledTime,
      jobDescription: createBookingDto.jobDescription,
      jobPhotos: createBookingDto.jobPhotos || [],
      estimatedDuration: createBookingDto.estimatedDuration,
      serviceAddress: createBookingDto.serviceAddress,
      serviceLatitude: createBookingDto.serviceLatitude,
      serviceLongitude: createBookingDto.serviceLongitude,
      estimatedCost: createBookingDto.estimatedCost,
      status: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedBooking = await booking.save();
    
    // Populate customer and worker details
    const populatedBooking = await this.bookingModel
      .findById(savedBooking._id)
      .populate('customerId', 'fullName email phone profilePicture')
      .populate('workerId', 'fullName email phone profilePicture work')
      .exec();
    
    if (!populatedBooking) {
      throw new NotFoundException('Booking not found after creation');
    }
    
    // Send push notification to worker
    const customerName = (populatedBooking.customerId as any).fullName || 'Un client';
    const bookingId = (savedBooking as any)._id?.toString() || savedBooking.toString();
    await this.pushService.notifyNewBooking(
      createBookingDto.workerId,
      customerName,
      createBookingDto.serviceType,
      bookingId,
    );
    
    return populatedBooking;
  }

  // Get all bookings for a user (customer or worker)
  async findAll(userId: string, role: string, status?: BookingStatus): Promise<Booking[]> {
    const query: any = {};
    
    if (role === 'customer') {
      query.customerId = new Types.ObjectId(userId);
    } else if (role === 'worker') {
      query.workerId = new Types.ObjectId(userId);
    }

    if (status) {
      query.status = status;
    }

    return this.bookingModel
      .find(query)
      .populate('customerId', 'fullName email phone profilePicture')
      .populate('workerId', 'fullName email phone profilePicture work')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Get booking by ID
  async findOne(id: string, userId: string): Promise<Booking> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid booking ID');
    }

    const booking = await this.bookingModel
      .findById(id)
      .populate('customerId', 'fullName email phone profilePicture address latitude longitude')
      .populate('workerId', 'fullName email phone profilePicture work address latitude longitude')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check if user has access to this booking
    const userIdObj = new Types.ObjectId(userId);
    if (!booking.customerId._id.equals(userIdObj) && !booking.workerId._id.equals(userIdObj)) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  // Update booking status
  async updateStatus(
    id: string,
    userId: string,
    updateStatusDto: UpdateBookingStatusDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);
    const userIdObj = new Types.ObjectId(userId);

    // Validate status transitions
    this.validateStatusTransition(booking, updateStatusDto.status, userIdObj);

    // Update booking based on new status
    const updateData: any = {
      status: updateStatusDto.status,
    };

    switch (updateStatusDto.status) {
      case BookingStatus.CONFIRMED:
        updateData.acceptedAt = new Date();
        // Create availability entry to block this time slot
        await this.availabilityService.createBookingAvailability(
          booking.workerId._id.toString(),
          id,
          booking.scheduledDate,
          booking.scheduledTime,
          booking.estimatedDuration || 60,
        );
        break;

      case BookingStatus.REJECTED:
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = updateStatusDto.rejectionReason;
        break;

      case BookingStatus.CANCELLED:
        updateData.cancelledAt = new Date();
        updateData.cancelledBy = userIdObj;
        updateData.cancellationReason = updateStatusDto.cancellationReason;
        // Remove availability entry to free up the time slot
        await this.availabilityService.removeBookingAvailability(id);
        break;

      case BookingStatus.WORK_FINISHED:
        updateData.workFinishedAt = new Date();
        if (updateStatusDto.finalCost !== undefined) {
          updateData.finalCost = updateStatusDto.finalCost;
        }
        if (updateStatusDto.completionPhotos) {
          updateData.completionPhotos = updateStatusDto.completionPhotos;
        }
        // Note: La facture sera créée après la mise à jour du booking
        break;

      case BookingStatus.COMPLETED:
        updateData.completedAt = new Date();
        break;
    }

    if (updateStatusDto.workerNotes) {
      updateData.workerNotes = updateStatusDto.workerNotes;
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('customerId', 'fullName email phone profilePicture')
      .populate('workerId', 'fullName email phone profilePicture work')
      .exec();

    if (!updatedBooking) {
      throw new NotFoundException('Booking not found');
    }

    // Send push notifications based on status change
    const workerName = (updatedBooking.workerId as any).fullName || 'Le technicien';
    const customerName = (updatedBooking.customerId as any).fullName || 'Le client';
    const customerId = (updatedBooking.customerId as any)._id.toString();
    const workerId = (updatedBooking.workerId as any)._id.toString();

    switch (updateStatusDto.status) {
      case BookingStatus.CONFIRMED:
        await this.pushService.notifyBookingAccepted(customerId, workerName, id);
        break;
      case BookingStatus.REJECTED:
        await this.pushService.notifyBookingRejected(customerId, workerName, id);
        break;
      case BookingStatus.CANCELLED:
        // Notify the other party
        if (userId === customerId) {
          await this.pushService.notifyBookingCancelled(workerId, customerName, id);
        } else {
          await this.pushService.notifyBookingCancelled(customerId, workerName, id);
        }
        break;
      case BookingStatus.ON_THE_WAY:
        await this.pushService.notifyWorkerOnTheWay(customerId, workerName, id);
        break;
      case BookingStatus.IN_PROGRESS:
        await this.pushService.notifyJobStarted(customerId, workerName, id);
        break;
      case BookingStatus.WORK_FINISHED:
        // Créer la facture APRÈS la mise à jour du booking (pour avoir le bon finalCost)
        try {
          await this.paymentsService.createInvoiceFromBooking(id);
          console.log('✅ Invoice created successfully for booking:', id);
        } catch (invoiceError) {
          console.log('Invoice creation error (may already exist):', invoiceError.message);
        }
        await this.pushService.notifyWorkFinished(customerId, workerName, id, updatedBooking.finalCost || updatedBooking.estimatedCost || 0);
        break;
      case BookingStatus.COMPLETED:
        await this.pushService.notifyJobCompleted(customerId, workerName, id);
        break;
    }

    return updatedBooking;
  }

  // Process payment - marks booking as COMPLETED
  async processPayment(
    id: string,
    userId: string,
    paymentDto: ProcessPaymentDto,
  ): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    // Only customer can make payment
    const userIdObj = new Types.ObjectId(userId);
    if (!booking.customerId._id.equals(userIdObj)) {
      throw new ForbiddenException('Only the customer can make payment');
    }

    // Booking must have work finished before payment
    if (booking.status !== BookingStatus.WORK_FINISHED) {
      throw new BadRequestException('Work must be finished before payment');
    }

    // Already paid
    if (booking.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Booking is already paid');
    }

    const updateData: any = {
      status: BookingStatus.COMPLETED, // Mark as completed after payment
      paymentStatus: PaymentStatus.PAID,
      paymentMethod: paymentDto.paymentMethod,
      paidAt: new Date(),
      completedAt: new Date(),
    };

    if (paymentDto.tip) {
      updateData.tip = paymentDto.tip;
    }

    if (paymentDto.stripePaymentIntentId) {
      updateData.stripePaymentIntentId = paymentDto.stripePaymentIntentId;
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('customerId', 'fullName email phone profilePicture')
      .populate('workerId', 'fullName email phone profilePicture work')
      .exec();

    if (!updatedBooking) {
      throw new NotFoundException('Booking not found');
    }

    // Send push notification to worker about payment
    const workerId = (updatedBooking.workerId as any)._id.toString();
    const amount = updatedBooking.finalCost || updatedBooking.estimatedCost || 0;
    await this.pushService.notifyPaymentReceived(workerId, amount, id);

    return updatedBooking;
  }

  // Cancel booking
  async cancel(id: string, userId: string, reason: string): Promise<Booking> {
    const booking = await this.findOne(id, userId);

    // Cannot cancel if already completed or cancelled
    if ([BookingStatus.COMPLETED, BookingStatus.CANCELLED].includes(booking.status)) {
      throw new BadRequestException(`Cannot cancel a ${booking.status} booking`);
    }

    const updateData: any = {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: new Types.ObjectId(userId),
      cancellationReason: reason,
    };

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('customerId', 'fullName email phone profilePicture')
      .populate('workerId', 'fullName email phone profilePicture work')
      .exec();

    if (!updatedBooking) {
      throw new NotFoundException('Booking not found');
    }

    return updatedBooking;
  }

  // Get customer's bookings
  async getCustomerBookings(customerId: string, status?: BookingStatus): Promise<Booking[]> {
    return this.findAll(customerId, 'customer', status);
  }

  // Get worker's bookings
  async getWorkerBookings(workerId: string, status?: BookingStatus): Promise<Booking[]> {
    return this.findAll(workerId, 'worker', status);
  }

  // Get booking statistics for worker
  async getWorkerStats(workerId: string): Promise<any> {
    const stats = await this.bookingModel.aggregate([
      { $match: { workerId: new Types.ObjectId(workerId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: { $sum: { $add: ['$finalCost', { $ifNull: ['$tip', 0] }] } },
        },
      },
    ]);

    const completedBookings = await this.bookingModel.countDocuments({
      workerId: new Types.ObjectId(workerId),
      status: BookingStatus.COMPLETED,
    });

    return {
      stats,
      completedBookings,
    };
  }

  // Private helper: Validate status transitions
  private validateStatusTransition(
    booking: Booking,
    newStatus: BookingStatus,
    userId: Types.ObjectId,
  ): void {
    const currentStatus = booking.status;
    const isWorker = booking.workerId._id.equals(userId);
    const isCustomer = booking.customerId._id.equals(userId);

    // Define valid transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.REJECTED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.ON_THE_WAY, BookingStatus.CANCELLED],
      [BookingStatus.ON_THE_WAY]: [BookingStatus.IN_PROGRESS, BookingStatus.CANCELLED],
      [BookingStatus.IN_PROGRESS]: [BookingStatus.WORK_FINISHED, BookingStatus.CANCELLED],
      [BookingStatus.WORK_FINISHED]: [BookingStatus.COMPLETED, BookingStatus.CANCELLED], // COMPLETED only via payment
      [BookingStatus.COMPLETED]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.REJECTED]: [],
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Check permissions for specific transitions
    if (newStatus === BookingStatus.CONFIRMED || newStatus === BookingStatus.REJECTED) {
      if (!isWorker) {
        throw new ForbiddenException('Only the worker can confirm or reject a booking');
      }
    }

    if ([BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS, BookingStatus.WORK_FINISHED].includes(newStatus)) {
      if (!isWorker) {
        throw new ForbiddenException('Only the worker can update job progress');
      }
    }

    // Only payment can mark as COMPLETED (handled in processPayment)
    if (newStatus === BookingStatus.COMPLETED) {
      throw new ForbiddenException('Booking can only be completed through payment');
    }
  }
}
