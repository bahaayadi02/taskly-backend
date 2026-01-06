import { IsNotEmpty, IsString, IsNumber, IsDateString, IsOptional, IsArray, Min, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({
    description: 'Worker ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  workerId: string;

  @ApiProperty({
    description: 'Service type',
    example: 'Electrician',
  })
  @IsNotEmpty()
  @IsString()
  serviceType: string;

  @ApiProperty({
    description: 'Scheduled date (ISO 8601)',
    example: '2025-11-20',
  })
  @IsNotEmpty()
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Scheduled time (HH:mm format)',
    example: '14:30',
  })
  @IsNotEmpty()
  @IsString()
  scheduledTime: string;

  @ApiProperty({
    description: 'Job description',
    example: 'Need to fix electrical wiring in the kitchen',
  })
  @IsNotEmpty()
  @IsString()
  jobDescription: string;

  @ApiProperty({
    description: 'Job photos URLs',
    example: ['https://example.com/photo1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobPhotos?: string[];

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 120,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(15)
  estimatedDuration?: number;

  @ApiProperty({
    description: 'Service address',
    example: 'Mateur, Tunisia',
  })
  @IsNotEmpty()
  @IsString()
  serviceAddress: string;

  @ApiProperty({
    description: 'Service latitude',
    example: 37.0403,
  })
  @IsNotEmpty()
  @IsNumber()
  serviceLatitude: number;

  @ApiProperty({
    description: 'Service longitude',
    example: 9.6658,
  })
  @IsNotEmpty()
  @IsNumber()
  serviceLongitude: number;

  @ApiProperty({
    description: 'Estimated cost',
    example: 50,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedCost?: number;
}
