import { IsEnum, IsOptional, IsString, IsNumber, IsArray, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '../../schemas/booking.schema';

export class UpdateBookingStatusDto {
  @ApiProperty({
    description: 'New booking status',
    enum: BookingStatus,
    example: BookingStatus.CONFIRMED,
  })
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @ApiProperty({
    description: 'Worker notes',
    example: 'Will arrive 10 minutes early',
    required: false,
  })
  @IsOptional()
  @IsString()
  workerNotes?: string;

  @ApiProperty({
    description: 'Final cost (for completed bookings)',
    example: 75,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  finalCost?: number;

  @ApiProperty({
    description: 'Completion photos URLs',
    example: ['https://example.com/completed1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completionPhotos?: string[];

  @ApiProperty({
    description: 'Rejection reason (if rejecting)',
    example: 'Not available at that time',
    required: false,
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiProperty({
    description: 'Cancellation reason (if cancelling)',
    example: 'Customer requested cancellation',
    required: false,
  })
  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
