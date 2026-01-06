import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilityDocument = Availability & Document;

export enum AvailabilityType {
  BLOCKED = 'blocked',       // Worker manually blocked this time
  BOOKED = 'booked',         // Time slot is booked by a customer
}

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  workerId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // e.g., "09:00"

  @Prop({ required: true })
  endTime: string; // e.g., "12:00"

  @Prop({ 
    type: String, 
    enum: AvailabilityType, 
    default: AvailabilityType.BLOCKED 
  })
  type: AvailabilityType;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId; // Reference to booking if type is BOOKED

  @Prop({ trim: true })
  note?: string; // Optional note for blocked time

  @Prop({ default: false })
  isRecurring: boolean;

  @Prop({ type: [Number] }) // 0=Sunday, 1=Monday, etc.
  recurringDays?: number[];
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Indexes
AvailabilitySchema.index({ workerId: 1, date: 1 });
AvailabilitySchema.index({ workerId: 1, date: 1, startTime: 1, endTime: 1 });
