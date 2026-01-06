import { IsOptional, IsString, IsNumber, IsArray, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateReviewDto {
  @ApiProperty({
    description: 'Rating (1-5 stars)',
    example: 5,
    minimum: 1,
    maximum: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({
    description: 'Review comment',
    example: 'Updated review comment',
    required: false,
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Review photos URLs',
    example: ['https://example.com/review1.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];
}

export class WorkerResponseDto {
  @ApiProperty({
    description: 'Worker response to review',
    example: 'Thank you for your feedback!',
  })
  @IsNotEmpty()
  @IsString()
  response: string;
}
