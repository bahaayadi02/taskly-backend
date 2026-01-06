import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument, AvailabilityType } from '../schemas/availability.schema';
import { Booking, BookingDocument, BookingStatus } from '../schemas/booking.schema';
import { CreateAvailabilityDto, CheckAvailabilityDto } from './dto/availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name) private availabilityModel: Model<AvailabilityDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  // Block a time slot
  async blockTimeSlot(workerId: string, dto: CreateAvailabilityDto): Promise<Availability> {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    // Check if slot already blocked
    const existing = await this.availabilityModel.findOne({
      workerId: new Types.ObjectId(workerId),
      date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    if (existing) {
      throw new BadRequestException('This time slot is already blocked');
    }

    const availability = new this.availabilityModel({
      workerId: new Types.ObjectId(workerId),
      date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      type: dto.type || AvailabilityType.BLOCKED,
      note: dto.note,
      isRecurring: dto.isRecurring || false,
      recurringDays: dto.recurringDays,
    });

    return availability.save();
  }

  // Unblock a time slot
  async unblockTimeSlot(workerId: string, availabilityId: string): Promise<void> {
    const result = await this.availabilityModel.deleteOne({
      _id: new Types.ObjectId(availabilityId),
      workerId: new Types.ObjectId(workerId),
      type: AvailabilityType.BLOCKED,
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Blocked time slot not found');
    }
  }

  // Get worker's blocked slots for a date range
  async getWorkerAvailability(workerId: string, startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get manually blocked slots
    const blockedSlots = await this.availabilityModel.find({
      workerId: new Types.ObjectId(workerId),
      date: { $gte: start, $lte: end },
    }).sort({ date: 1, startTime: 1 });

    // Get confirmed bookings
    const bookings = await this.bookingModel.find({
      workerId: new Types.ObjectId(workerId),
      scheduledDate: { $gte: start, $lte: end },
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS] },
    }).sort({ scheduledDate: 1 });

    return {
      blockedSlots,
      bookings: bookings.map(b => ({
        id: b._id,
        date: b.scheduledDate,
        time: b.scheduledTime,
        duration: b.estimatedDuration || 60,
        status: b.status,
        serviceType: b.serviceType,
      })),
    };
  }

  // Check if a specific time slot is available
  async checkAvailability(dto: CheckAvailabilityDto): Promise<{ available: boolean; reason?: string }> {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);
    const duration = dto.duration || 60;

    // Calculate end time
    const [hours, minutes] = dto.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    // Check for blocked slots that overlap
    const blockedSlot = await this.availabilityModel.findOne({
      workerId: new Types.ObjectId(dto.workerId),
      date,
      $or: [
        { startTime: { $lt: endTime }, endTime: { $gt: dto.startTime } },
      ],
    });

    if (blockedSlot) {
      return {
        available: false,
        reason: blockedSlot.type === AvailabilityType.BOOKED 
          ? 'This time slot is already booked' 
          : 'Worker is not available at this time',
      };
    }

    // Check for existing bookings that overlap
    const existingBooking = await this.bookingModel.findOne({
      workerId: new Types.ObjectId(dto.workerId),
      scheduledDate: date,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS] },
    });

    if (existingBooking) {
      // Check time overlap
      const bookingStart = this.timeToMinutes(existingBooking.scheduledTime);
      const bookingEnd = bookingStart + (existingBooking.estimatedDuration || 60);
      const requestStart = startMinutes;
      const requestEnd = endMinutes;

      if (requestStart < bookingEnd && requestEnd > bookingStart) {
        return {
          available: false,
          reason: 'Worker has another booking at this time',
        };
      }
    }

    return { available: true };
  }

  // Get available time slots for a worker on a specific date
  async getAvailableSlots(workerId: string, date: string): Promise<string[]> {
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Default working hours: 8:00 - 18:00
    const workingHours = { start: 8, end: 18 };
    const slotDuration = 60; // 1 hour slots

    // Get all blocked slots and bookings for this date
    const blockedSlots = await this.availabilityModel.find({
      workerId: new Types.ObjectId(workerId),
      date: targetDate,
    });

    const bookings = await this.bookingModel.find({
      workerId: new Types.ObjectId(workerId),
      scheduledDate: targetDate,
      status: { $in: [BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.ON_THE_WAY, BookingStatus.IN_PROGRESS] },
    });

    // Generate all possible slots
    const allSlots: string[] = [];
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    // Filter out unavailable slots
    const availableSlots = allSlots.filter(slot => {
      const slotMinutes = this.timeToMinutes(slot);
      const slotEnd = slotMinutes + slotDuration;

      // Check blocked slots
      for (const blocked of blockedSlots) {
        const blockedStart = this.timeToMinutes(blocked.startTime);
        const blockedEnd = this.timeToMinutes(blocked.endTime);
        if (slotMinutes < blockedEnd && slotEnd > blockedStart) {
          return false;
        }
      }

      // Check bookings
      for (const booking of bookings) {
        const bookingStart = this.timeToMinutes(booking.scheduledTime);
        const bookingEnd = bookingStart + (booking.estimatedDuration || 60);
        if (slotMinutes < bookingEnd && slotEnd > bookingStart) {
          return false;
        }
      }

      return true;
    });

    return availableSlots;
  }

  // Create availability entry when booking is confirmed
  async createBookingAvailability(workerId: string, bookingId: string, date: Date, time: string, duration: number): Promise<void> {
    const [hours, minutes] = time.split(':').map(Number);
    const endMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

    const bookingDate = new Date(date);
    bookingDate.setHours(0, 0, 0, 0);

    await this.availabilityModel.create({
      workerId: new Types.ObjectId(workerId),
      date: bookingDate,
      startTime: time,
      endTime,
      type: AvailabilityType.BOOKED,
      bookingId: new Types.ObjectId(bookingId),
    });
  }

  // Remove availability entry when booking is cancelled
  async removeBookingAvailability(bookingId: string): Promise<void> {
    await this.availabilityModel.deleteOne({
      bookingId: new Types.ObjectId(bookingId),
    });
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
