import { IsNotEmpty, IsString, IsOptional, IsArray, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from '../../schemas/message.schema';

export class SendMessageDto {
  @ApiProperty({
    description: 'Booking ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty()
  @IsString()
  bookingId: string;

  @ApiProperty({
    description: 'Receiver user ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty()
  @IsString()
  receiverId: string;

  @ApiProperty({
    description: 'Message type',
    enum: MessageType,
    example: MessageType.TEXT,
  })
  @IsEnum(MessageType)
  type: MessageType;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, I will arrive at 2 PM',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Attachment URLs (for images)',
    example: ['https://example.com/image.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({
    description: 'Latitude (for location messages)',
    example: 37.0403,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    description: 'Longitude (for location messages)',
    example: 9.6658,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
