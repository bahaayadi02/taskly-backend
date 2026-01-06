import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  BadRequestException,
  Req,
  Param,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto, ResendVerificationDto, VerifyPasswordResetDto, ResetPasswordWithCodeDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { SkipValidationPipe } from './pipes/skip-validation.pipe';

@ApiTags('Authentication')
@Controller('auth')
@ApiExtraModels(RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto, ResendVerificationDto, VerifyPasswordResetDto, ResetPasswordWithCodeDto)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new SkipValidationPipe()) // Completely skip validation to allow all fields
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Create a new user account with email verification. The user will receive a verification email with a 6-digit code.',
  })
  @ApiBody({
    type: RegisterDto,
    description: 'User registration data',
    examples: {
      customer: {
        summary: 'Customer Registration',
        description: 'Example registration for a customer',
        value: {
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          password: 'SecurePass123!',
          phone: '+33123456789',
          role: 'customer'
        }
      },
      worker: {
        summary: 'Worker Registration',
        description: 'Example registration for a worker',
        value: {
          fullName: 'Marie Dubois',
          email: 'marie.dubois@example.com',
          password: 'WorkerPass456!',
          phone: '+33987654321',
          role: 'worker',
          address: '123 Rue de Paris, 75001 Paris, France',
          latitude: 48.8566,
          longitude: 2.3522,
          work: 'Electrician'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User registered successfully' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Registration successful. Please check your email for verification code.' },
            email: { type: 'string', example: 'john.doe@example.com' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Validation failed' },
        error: { type: 'string', example: 'BadRequestException' }
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User already exists',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'User with this email already exists' },
        error: { type: 'string', example: 'ConflictException' }
      }
    }
  })
  async register(@Body(new SkipValidationPipe()) body: any) {
    // Log the raw body to see what we're receiving
    console.log('📥 [AUTH] Raw body received:', JSON.stringify(body, null, 2));
    
    // Manually map to DTO to bypass strict validation issues
    // Validate required fields manually
    if (!body.fullName || !body.email || !body.password || !body.phone || !body.role) {
      throw new BadRequestException('Missing required fields: fullName, email, password, phone, role');
    }
    
    const registerDto: RegisterDto = {
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phone: body.phone,
      role: body.role,
      address: body.address || undefined,
      latitude: body.latitude !== undefined && body.latitude !== null ? Number(body.latitude) : undefined,
      longitude: body.longitude !== undefined && body.longitude !== null ? Number(body.longitude) : undefined,
      work: body.work || undefined,
      cvUrl: body.cvUrl || undefined,
    };
    
    console.log('✅ [AUTH] Mapped DTO:', JSON.stringify(registerDto, null, 2));
    console.log('🚀 [AUTH] Registration attempt:', {
      email: registerDto.email,
      fullName: registerDto.fullName,
      role: registerDto.role,
      address: registerDto.address,
      latitude: registerDto.latitude,
      longitude: registerDto.longitude,
      work: registerDto.work,
      timestamp: new Date().toISOString()
    });
    console.log('📦 [AUTH] Full DTO received:', JSON.stringify(registerDto, null, 2));
    
    try {
      const result = await this.authService.register(registerDto);
      console.log('✅ [AUTH] Registration successful:', {
        email: registerDto.email,
        message: result.message
      });
      
      return {
        success: true,
        message: 'User registered successfully',
        data: result,
      };
    } catch (error) {
      console.error('❌ [AUTH] Registration failed:', {
        email: registerDto.email,
        error: error.message,
        stack: error.stack
      });
      
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticate user with email and password. Returns JWT token for authenticated requests.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
    examples: {
      customer: {
        summary: 'Customer Login',
        description: 'Login example for a customer',
        value: {
          email: 'john.doe@example.com',
          password: 'SecurePass123!'
        }
      },
      worker: {
        summary: 'Worker Login',
        description: 'Login example for a worker',
        value: {
          email: 'marie.dubois@example.com',
          password: 'WorkerPass456!'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns user data and JWT token.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '507f1f77bcf86cd799439011' },
                fullName: { type: 'string', example: 'John Doe' },
                email: { type: 'string', example: 'john.doe@example.com' },
                phone: { type: 'string', example: '+33123456789' },
                role: { type: 'string', example: 'customer' },
                isActive: { type: 'boolean', example: true },
                isEmailVerified: { type: 'boolean', example: true },
                address: { type: 'string', example: '123 Rue de Paris, 75001 Paris, France' },
                latitude: { type: 'number', example: 48.8566 },
                longitude: { type: 'number', example: 2.3522 },
                lastLoginAt: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
              }
            },
            token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid email or password' },
        error: { type: 'string', example: 'UnauthorizedException' }
      }
    }
  })
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    console.log('🔐 [AUTH] Login attempt:', {
      email: loginDto.email,
      timestamp: new Date().toISOString()
    });
    
    try {
      const result = await this.authService.login(loginDto);
      console.log('✅ [AUTH] Login successful:', {
        email: loginDto.email,
        role: result.user.role,
        userId: result.user.id
      });
      
      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      console.error('❌ [AUTH] Login failed:', {
        email: loginDto.email,
        error: error.message
      });
      
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    try {
      const result = await this.authService.forgotPassword(forgotPasswordDto);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(ValidationPipe) resetPasswordDto: ResetPasswordDto) {
    try {
      const result = await this.authService.resetPassword(resetPasswordDto);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the authenticated user\'s profile information. Requires valid JWT token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            fullName: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+33123456789' },
            role: { type: 'string', example: 'customer' },
            isActive: { type: 'boolean', example: true },
            isEmailVerified: { type: 'boolean', example: true },
            profilePicture: { type: 'string', example: null },
            address: { type: 'string', example: '123 Rue de Paris, 75001 Paris, France' },
            latitude: { type: 'number', example: 48.8566 },
            longitude: { type: 'number', example: 2.3522 },
            createdAt: { type: 'string', example: '2024-01-01T10:00:00.000Z' },
            lastLoginAt: { type: 'string', example: '2024-01-01T12:00:00.000Z' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'UnauthorizedException' }
      }
    }
  })
  async getProfile(@GetUser('userId') userId: string) {
    try {
      const user = await this.authService.getProfile(userId);
      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user profile',
    description: 'Update the authenticated user\'s profile information. Requires valid JWT token.',
  })
  @ApiBody({
    description: 'Profile update data',
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: 'John Updated Doe' },
        phone: { type: 'string', example: '+33987654321' },
        profilePicture: { type: 'string', example: 'https://example.com/profile.jpg' },
        address: { type: 'string', example: '123 Rue de Paris, 75001 Paris, France' },
        latitude: { type: 'number', example: 48.8566 },
        longitude: { type: 'number', example: 2.3522 }
      }
    },
    examples: {
      updateName: {
        summary: 'Update Name',
        description: 'Update only the full name',
        value: {
          fullName: 'John Updated Doe'
        }
      },
      updatePhone: {
        summary: 'Update Phone',
        description: 'Update only the phone number',
        value: {
          phone: '+33987654321'
        }
      },
      updateAll: {
        summary: 'Update All Fields',
        description: 'Update multiple fields at once',
        value: {
          fullName: 'John Updated Doe',
          phone: '+33987654321',
          profilePicture: 'https://example.com/profile.jpg'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            fullName: { type: 'string', example: 'John Updated Doe' },
            email: { type: 'string', example: 'john.doe@example.com' },
            phone: { type: 'string', example: '+33987654321' },
            role: { type: 'string', example: 'customer' },
            isActive: { type: 'boolean', example: true },
            isEmailVerified: { type: 'boolean', example: true },
            profilePicture: { type: 'string', example: 'https://example.com/profile.jpg' },
            address: { type: 'string', example: '123 Rue de Paris, 75001 Paris, France' },
            latitude: { type: 'number', example: 48.8566 },
            longitude: { type: 'number', example: 2.3522 },
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Unauthorized' },
        error: { type: 'string', example: 'UnauthorizedException' }
      }
    }
  })
  async updateProfile(
    @GetUser('userId') userId: string,
    @Body() updateData: any,
  ) {
    try {
      const user = await this.authService.updateProfile(userId, updateData);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('workers/locations')
  @ApiOperation({
    summary: 'List verified workers with location',
    description: 'Retrieve all verified and active workers along with their addresses and GPS coordinates.',
  })
  @ApiResponse({
    status: 200,
    description: 'Workers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Workers retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              fullName: { type: 'string', example: 'Marie Dubois' },
              address: { type: 'string', example: '123 Rue de Paris, 75001 Paris, France' },
              latitude: { type: 'number', example: 48.8566 },
              longitude: { type: 'number', example: 2.3522 },
              phone: { type: 'string', example: '+33987654321' },
              work: { type: 'string', example: 'Electrician' },
              profilePicture: { type: 'string', example: 'https://example.com/profile.jpg' },
            },
          },
        },
      },
    },
  })
  async getWorkersWithLocation() {
    try {
      const workers = await this.authService.getWorkersWithLocation();
      return {
        success: true,
        message: 'Workers retrieved successfully',
        data: workers,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('workers/category/:category')
  @ApiOperation({
    summary: 'Get workers by service category',
    description: 'Retrieve all verified workers filtered by their service category (e.g., Electrician, Plumber).',
  })
  @ApiResponse({
    status: 200,
    description: 'Workers retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Workers retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '507f1f77bcf86cd799439011' },
              fullName: { type: 'string', example: 'John Smith' },
              address: { type: 'string', example: 'Mateur, Tunisia' },
              latitude: { type: 'number', example: 37.0403 },
              longitude: { type: 'number', example: 9.6658 },
              phone: { type: 'string', example: '+21612345678' },
              work: { type: 'string', example: 'Electrician' },
              profilePicture: { type: 'string', example: 'https://example.com/profile.jpg' },
            },
          },
        },
      },
    },
  })
  async getWorkersByCategory(@Param('category') category: string) {
    try {
      const workers = await this.authService.getWorkersByCategory(category);
      return {
        success: true,
        message: `${category} workers retrieved successfully`,
        data: workers,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('verify-token')
  @UseGuards(JwtAuthGuard)
  async verifyToken(@GetUser() user: any) {
    return {
      success: true,
      message: 'Token is valid',
      data: {
        userId: user.userId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body(ValidationPipe) verifyEmailDto: VerifyEmailDto) {
    try {
      const result = await this.authService.verifyEmail(verifyEmailDto);
      return {
        success: true,
        message: 'Email verified successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body(ValidationPipe) resendDto: ResendVerificationDto) {
    try {
      const result = await this.authService.resendVerificationCode(resendDto);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('send-password-reset-code')
  @HttpCode(HttpStatus.OK)
  async sendPasswordResetCode(@Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto) {
    try {
      const result = await this.authService.sendPasswordResetCode(forgotPasswordDto);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('verify-password-reset-code')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordResetCode(@Body(ValidationPipe) verifyDto: VerifyPasswordResetDto) {
    try {
      const result = await this.authService.verifyPasswordResetCode(verifyDto);
      return {
        success: true,
        message: result.message,
        data: { resetToken: result.token },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('reset-password-with-code')
  @HttpCode(HttpStatus.OK)
  async resetPasswordWithCode(@Body(ValidationPipe) resetDto: ResetPasswordWithCodeDto) {
    try {
      const result = await this.authService.resetPasswordWithCode(resetDto);
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Change user password',
    description: 'Change the authenticated user\'s password. Requires current password verification and valid JWT token.',
  })
  @ApiBody({
    description: 'Password change data',
    schema: {
      type: 'object',
      required: ['oldPassword', 'newPassword'],
      properties: {
        oldPassword: { type: 'string', example: 'CurrentPass123!' },
        newPassword: { type: 'string', example: 'NewSecurePass456!' }
      }
    },
    examples: {
      changePassword: {
        summary: 'Change Password',
        description: 'Example password change request',
        value: {
          oldPassword: 'CurrentPass123!',
          newPassword: 'NewSecurePass456!'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Password changed successfully' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid password requirements',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'New password must be at least 8 characters long' },
        error: { type: 'string', example: 'BadRequestException' }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid current password or JWT token',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Current password is incorrect' },
        error: { type: 'string', example: 'UnauthorizedException' }
      }
    }
  })
  async changePassword(
    @GetUser('userId') userId: string,
    @Body() changePasswordData: { oldPassword: string; newPassword: string },
  ) {
    try {
      const result = await this.authService.changePassword(
        userId,
        changePasswordData.oldPassword,
        changePasswordData.newPassword,
      );
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('switch-role')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Switch user role',
    description: 'Toggle user role between customer and worker. Returns new token with updated role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Role switched successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Role switched to worker' },
        data: {
          type: 'object',
          properties: {
            user: { type: 'object' },
            token: { type: 'string' }
          }
        }
      }
    }
  })
  async switchRole(@GetUser('userId') userId: string) {
    try {
      const result = await this.authService.switchRole(userId);
      return {
        success: true,
        message: `Role switched to ${result.user.role}`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Put('worker/complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Complete worker profile',
    description: 'Update worker profile completion fields and calculate completion percentage.',
  })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Profile updated successfully' },
        data: {
          type: 'object',
          properties: {
            profileCompletionPercentage: { type: 'number', example: 85 },
            yearsOfExperience: { type: 'number', example: 5 },
            skills: { type: 'array', items: { type: 'string' }, example: ['Plumbing', 'Electrical'] },
            certificates: { type: 'array', items: { type: 'string' } },
            aboutMe: { type: 'string', example: 'Experienced professional...' }
          }
        }
      }
    }
  })
  async completeWorkerProfile(
    @GetUser('userId') userId: string,
    @Body(ValidationPipe) updateProfileDto: UpdateProfileDto,
  ) {
    try {
      const result = await this.authService.updateWorkerProfile(userId, updateProfileDto);
      return {
        success: true,
        message: 'Profile updated successfully',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  // ==================== KYC ENDPOINTS ====================

  @Post('kyc/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Submit KYC documents',
    description: 'Submit KYC verification documents (selfie, ID front, ID back) for worker verification.',
  })
  @ApiBody({
    description: 'KYC document URLs',
    schema: {
      type: 'object',
      required: ['selfieUrl', 'idFrontUrl', 'idBackUrl'],
      properties: {
        selfieUrl: { type: 'string', example: 'https://example.com/uploads/selfie.jpg' },
        idFrontUrl: { type: 'string', example: 'https://example.com/uploads/id-front.jpg' },
        idBackUrl: { type: 'string', example: 'https://example.com/uploads/id-back.jpg' }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'KYC documents submitted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'KYC documents submitted successfully. Please wait for admin verification.' }
      }
    }
  })
  async submitKyc(
    @GetUser('userId') userId: string,
    @Body() body: { selfieUrl: string; idFrontUrl: string; idBackUrl: string },
  ) {
    try {
      const result = await this.authService.submitKyc(
        userId,
        body.selfieUrl,
        body.idFrontUrl,
        body.idBackUrl,
      );
      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('kyc/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get KYC status',
    description: 'Get the current KYC verification status for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            kycStatus: { type: 'string', example: 'pending' },
            kycSubmittedAt: { type: 'string', example: '2024-01-01T12:00:00.000Z' },
            kycVerifiedAt: { type: 'string', example: null },
            kycRejectionReason: { type: 'string', example: null }
          }
        }
      }
    }
  })
  async getKycStatus(@GetUser('userId') userId: string) {
    try {
      const result = await this.authService.getKycStatus(userId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('verify-email-worker')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email for worker',
    description: 'Verify email for worker registration. Returns requiresKyc flag instead of token.',
  })
  async verifyEmailForWorker(@Body(ValidationPipe) verifyEmailDto: VerifyEmailDto) {
    try {
      const result = await this.authService.verifyEmailForWorker(verifyEmailDto);
      return {
        success: true,
        message: result.message,
        data: {
          requiresKyc: result.requiresKyc,
          email: result.email,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('login-after-kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login after KYC approval',
    description: 'Login for workers after their KYC has been approved.',
  })
  @ApiBody({
    description: 'Email for login',
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'worker@example.com' }
      }
    }
  })
  async loginAfterKyc(@Body() body: { email: string }) {
    try {
      const result = await this.authService.loginAfterKyc(body.email);
      return {
        success: true,
        message: 'Login successful',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }
}