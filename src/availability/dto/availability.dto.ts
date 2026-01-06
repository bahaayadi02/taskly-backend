import { IsString, IsDateString, IsOptional, IsBoolean, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityType } from '../../schemas/availability.schema';

export class CreateAvailabilityDto {
  @ApiProperty({ example: '2025-12-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '12:00' })
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ enum: AvailabilityType })
  @IsOptional()
  @IsEnum(AvailabilityType)
  type?: AvailabilityType;

  @ApiPropertyOptional({ example: 'Personal appointment' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: [1, 3, 5], description: '0=Sunday, 1=Monday, etc.' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recurringDays?: number[];
}

export class GetAvailabilityDto {
  @ApiProperty({ example: '2025-12-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-12-31' })
  @IsDateString()
  endDate: string;
}

export class CheckAvailabilityDto {
  @ApiProperty({ example: 'worker_id_here' })
  @IsString()
  workerId: string;

  @ApiProperty({ example: '2025-12-10' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiPropertyOptional({ example: 60, description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  duration?: number;
}
