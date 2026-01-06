import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsArray, IsString, Min, Max } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'Years of experience',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  yearsOfExperience?: number;

  @ApiProperty({
    description: 'Array of skills',
    example: ['Plumbing', 'Electrical Work', 'Problem Solving'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({
    description: 'Array of certificate image URLs (base64 encoded)',
    example: ['data:image/jpeg;base64,...', 'data:image/png;base64,...'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certificates?: string[];

  @ApiProperty({
    description: 'About me description',
    example: 'Experienced electrician with 5 years of expertise...',
    required: false,
  })
  @IsOptional()
  @IsString()
  aboutMe?: string;
}
