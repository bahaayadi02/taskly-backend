import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum BookingStatus {
  PENDING = 'pending',           // Waiting for worker to accept
  CONFIRMED = 'confirmed',       // Worker accepted
  ON_THE_WAY = 'on_the_way',    // Worker traveling
  IN_PROGRESS = 'in_progress',   // Worker is working
  WORK_FINISHED = 'work_finished', // Worker finished, awaiting payment
  COMPLETED = 'completed',       // Payment received - fully completed
  CANCELLED = 'cancelled',       // Booking cancelled
  REJECTED = 'rejected',         // Worker rejected
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
}

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  workerId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  serviceType: string; // e.g., "Electrician", "Plumber"

  @Prop({ required: true })
  scheduledDate: Date;

  @Prop({ required: true })
  scheduledTime: string; // e.g., "14:00"

  @Prop({ required: true, trim: true })
  jobDescription: string;

  @Prop({ type: [String], default: [] })
  jobPhotos: string[]; // URLs to uploaded photos

  @Prop()
  estimatedDuration?: number; // in minutes

  @Prop({ required: true, trim: true })
  serviceAddress: string;

  @Prop({ required: true })
  serviceLatitude: number;

  @Prop({ required: true })
  serviceLongitude: number;

  @Prop({ 
    type: String, 
    enum: BookingStatus, 
    default: BookingStatus.PENDING 
  })
  status: BookingStatus;

  @Prop()
  estimatedCost?: number;

  @Prop()
  finalCost?: number;

  @Prop()
  tip?: number;

  @Prop({ 
    type: String, 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING 
  })
  paymentStatus: PaymentStatus;

  @Prop({ 
    type: String, 
    enum: PaymentMethod 
  })
  paymentMethod?: PaymentMethod;

  @Prop()
  paidAt?: Date;

  @Prop({ trim: true })
  stripePaymentIntentId?: string; // Stripe payment intent ID

  @Prop({ type: [String], default: [] })
  completionPhotos: string[]; // Photos of completed work

  @Prop({ trim: true })
  workerNotes?: string;

  @Prop()
  cancelledBy?: Types.ObjectId; // User who cancelled

  @Prop({ trim: true })
  cancellationReason?: string;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  workFinishedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop({ trim: true })
  rejectionReason?: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

// Indexes for better query performance
BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ workerId: 1, status: 1 });
BookingSchema.index({ scheduledDate: 1 });
BookingSchema.index({ createdAt: -1 });
