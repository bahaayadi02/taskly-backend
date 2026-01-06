import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength, Matches, ValidateIf, IsLatitude, IsLongitude, IsNumber, IsOptional, IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../schemas/user.schema';

export class RegisterDto {
  @ApiProperty({
    description: 'User\'s full name',
    example: 'John Doe',
    minLength: 2,
    type: String
  })
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString({ message: 'Full name must be a string' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  fullName: string;

  @ApiProperty({
    description: 'User\'s email address',
    example: 'john.doe@example.com',
    format: 'email',
    type: String
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User\'s password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
    minLength: 8,
    type: String
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({
    description: 'User\'s phone number (international format)',
    example: '+33123456789',
    type: String
  })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString({ message: 'Phone number must be a string' })
  @Matches(/^[\+]?[1-9][\d]{0,15}$/, { message: 'Please provide a valid phone number' })
  phone: string;

  @ApiProperty({
    description: 'User\'s role in the system',
    example: 'customer',
    enum: UserRole,
    enumName: 'UserRole'
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Role must be either customer, worker, or admin' })
  role: UserRole;

  @ApiProperty({
    description: 'Worker address (required for workers)',
    example: '123 Rue de Paris, 75001 Paris, France',
    required: false,
    type: String,
  })
  address?: string;

  @ApiProperty({
    description: 'Worker latitude coordinate (required for workers)',
    example: 48.8566,
    required: false,
    type: Number,
  })
  latitude?: number;

  @ApiProperty({
    description: 'Worker longitude coordinate (required for workers)',
    example: 2.3522,
    required: false,
    type: Number,
  })
  longitude?: number;

  @ApiProperty({
    description: 'Worker service/work category (required for workers)',
    example: 'Electrician',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'Work must be a string' })
  work?: string;

  @ApiProperty({
    description: 'Worker CV URL (Image file: JPG, PNG, GIF, etc., required for workers)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
    required: false,
    type: String,
  })
  @IsOptional()
  @IsString({ message: 'CV URL must be a string' })
  cvUrl?: string;
}


