import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { VerifyEmailDto, ResendVerificationDto, VerifyPasswordResetDto, ResetPasswordWithCodeDto } from './dto/verify-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ message: string; email: string }> {
    const { email, password, fullName, phone, role, address, latitude, longitude, work, cvUrl } = registerDto;

    // Validate worker location fields
    if (role === UserRole.WORKER) {
      if (!address || !latitude || !longitude) {
        throw new BadRequestException('Address, latitude, and longitude are required for workers');
      }
      // Validate latitude range
      if (latitude < -90 || latitude > 90) {
        throw new BadRequestException('Latitude must be between -90 and 90');
      }
      // Validate longitude range
      if (longitude < -180 || longitude > 180) {
        throw new BadRequestException('Longitude must be between -180 and 180');
      }
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        throw new ConflictException('User with this email already exists');
      } else {
        // User exists but not verified, update their info and resend verification
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const verificationCode = this.emailService.generateVerificationCode();
        const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        existingUser.fullName = fullName;
        existingUser.password = hashedPassword;
        existingUser.phone = phone;
        existingUser.role = role;
        existingUser.address = address;
        existingUser.latitude = latitude;
        existingUser.longitude = longitude;
        existingUser.work = work;
        existingUser.cvUrl = cvUrl;
        existingUser.emailVerificationCode = verificationCode;
        existingUser.emailVerificationCodeExpires = verificationExpires;

        await existingUser.save();

        // Send verification email (non-blocking to avoid timeout)
        this.emailService.sendEmailVerificationCode(email, verificationCode, fullName)
          .catch(err => console.error('Failed to send verification email:', err));

        return {
          message: 'Verification code sent to your email. Please verify your account.',
          email,
        };
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate verification code
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create user (not verified yet)
    const user = new this.userModel({
      fullName,
      email,
      password: hashedPassword,
      phone,
      role,
      address,
      latitude,
      longitude,
      work,
      cvUrl,
      isEmailVerified: false,
      isWorkerAccount: role === UserRole.WORKER, // Track if originally registered as worker
      emailVerificationCode: verificationCode,
      emailVerificationCodeExpires: verificationExpires,
    });

    await user.save();

    // Send verification email (non-blocking to avoid timeout)
    this.emailService.sendEmailVerificationCode(email, verificationCode, fullName)
      .catch(err => console.error('Failed to send verification email:', err));

    return {
      message: 'Registration successful! Please check your email for verification code.',
      email,
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: any; token: string }> {
    const { email, password } = loginDto;

    // Find user and include password for validation
    const user = await this.userModel.findOne({ email }).select('+password');
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email address before logging in');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    
    // Set default profileCompletionPercentage for workers if not set
    if (user.role === UserRole.WORKER && user.profileCompletionPercentage === undefined) {
      user.profileCompletionPercentage = 50;
    }
    
    await user.save();

    // Generate JWT token
    const payload = { sub: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Return user without password
    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isWorkerAccount: user.isWorkerAccount,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      profilePicture: user.profilePicture,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      lastLoginAt: user.lastLoginAt,
      profileCompletionPercentage: user.profileCompletionPercentage,
      yearsOfExperience: user.yearsOfExperience,
      skills: user.skills,
      certificates: user.certificates,
      aboutMe: user.aboutMe,
      isFaceVerified: user.isFaceVerified,
      faceVerifiedAt: user.faceVerifiedAt,
    };

    return { user: userResponse, token };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.userModel.findOne({ email }).select('+password');
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetTokenExpiry;
    await user.save();

    // TODO: Send email with reset token
    // For now, we'll return the token (in production, this should be sent via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { message: 'Password reset token sent to your email' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and clear reset token
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return { message: 'Password has been reset successfully' };
  }

  async getProfile(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Set default profileCompletionPercentage for workers if not set
    if (user.role === UserRole.WORKER && user.profileCompletionPercentage === undefined) {
      user.profileCompletionPercentage = 50;
      await user.save();
    }

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isWorkerAccount: user.isWorkerAccount,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      profilePicture: user.profilePicture,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: (user as any).createdAt,
      lastLoginAt: user.lastLoginAt,
      profileCompletionPercentage: user.profileCompletionPercentage,
      yearsOfExperience: user.yearsOfExperience,
      skills: user.skills,
      certificates: user.certificates,
      aboutMe: user.aboutMe,
      isFaceVerified: user.isFaceVerified,
      faceVerifiedAt: user.faceVerifiedAt,
    };
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update allowed fields
    const allowedUpdates = ['fullName', 'phone', 'profilePicture', 'address', 'latitude', 'longitude'];
    const updates = {};
    
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    });

    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return {
      id: updatedUser._id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      isEmailVerified: updatedUser.isEmailVerified,
      profilePicture: updatedUser.profilePicture,
      address: updatedUser.address,
      latitude: updatedUser.latitude,
      longitude: updatedUser.longitude,
    };
  }

  /**
   * Switch user role between customer and worker
   * Only workers can switch roles (isWorkerAccount=true OR role=worker OR has work field)
   */
  async switchRole(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Only allow switching for worker accounts (not pure customers or admins)
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin users cannot switch roles');
    }

    // Check if user can switch: isWorkerAccount OR currently worker OR has work field
    const canSwitch = user.isWorkerAccount || user.role === UserRole.WORKER || (user.work && user.work.trim() !== '');
    
    if (!canSwitch) {
      throw new BadRequestException('Only worker accounts can switch between roles');
    }

    // If switching for first time, mark as worker account
    if (!user.isWorkerAccount) {
      await this.userModel.findByIdAndUpdate(userId, { isWorkerAccount: true });
    }

    // Toggle role between worker and customer
    const newRole = user.role === UserRole.CUSTOMER ? UserRole.WORKER : UserRole.CUSTOMER;
    
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { role: newRole },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Generate new token with updated role
    const payload = { sub: updatedUser._id, email: updatedUser.email, role: updatedUser.role };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        isWorkerAccount: updatedUser.isWorkerAccount,
        isActive: updatedUser.isActive,
        isEmailVerified: updatedUser.isEmailVerified,
        profilePicture: updatedUser.profilePicture,
        address: updatedUser.address,
        latitude: updatedUser.latitude,
        longitude: updatedUser.longitude,
        work: updatedUser.work,
        cvUrl: updatedUser.cvUrl,
        yearsOfExperience: updatedUser.yearsOfExperience,
        skills: updatedUser.skills,
        certificates: updatedUser.certificates,
        aboutMe: updatedUser.aboutMe,
        profileCompletionPercentage: updatedUser.profileCompletionPercentage,
        isFaceVerified: updatedUser.isFaceVerified,
      },
      token,
    };
  }

  /**
   * Verify email with verification code
   */
  async verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{ user: any; token: string }> {
    const { email, code } = verifyEmailDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (user.emailVerificationCodeExpires < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.emailVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Verify the user
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    await user.save();

    // Send welcome email (non-blocking to avoid timeout)
    this.emailService.sendWelcomeEmail(user.email, user.fullName, user.role)
      .catch(err => console.error('Failed to send welcome email:', err));

    // Generate JWT token
    const payload = { sub: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    // Return user data
    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: (user as any).createdAt,
    };

    return {
      user: userResponse,
      token,
    };
  }

  /**
   * Resend email verification code
   */
  async resendVerificationCode(resendDto: ResendVerificationDto): Promise<{ message: string }> {
    const { email } = resendDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new verification code
    const verificationCode = this.emailService.generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = verificationExpires;
    await user.save();

    // Send verification email (non-blocking to avoid timeout)
    this.emailService.sendEmailVerificationCode(email, verificationCode, user.fullName)
      .catch(err => console.error('Failed to send verification email:', err));

    return {
      message: 'Verification code sent to your email',
    };
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetCode(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account with this email exists, you will receive a password reset code.',
      };
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Please verify your email address first');
    }

    // Generate password reset code
    const resetCode = this.emailService.generateVerificationCode();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetCode = resetCode;
    user.passwordResetCodeExpires = resetExpires;
    await user.save();

    // Send password reset email (non-blocking to avoid timeout)
    this.emailService.sendPasswordResetCode(email, resetCode, user.fullName)
      .catch(err => console.error('Failed to send password reset email:', err));

    return {
      message: 'Password reset code sent to your email',
    };
  }

  /**
   * Verify password reset code
   */
  async verifyPasswordResetCode(verifyDto: VerifyPasswordResetDto): Promise<{ message: string; token: string }> {
    const { email, code } = verifyDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
      throw new BadRequestException('No password reset code found. Please request a new one.');
    }

    if (user.passwordResetCodeExpires < new Date()) {
      throw new BadRequestException('Password reset code has expired. Please request a new one.');
    }

    if (user.passwordResetCode !== code) {
      throw new BadRequestException('Invalid password reset code');
    }

    // Generate a temporary token for password reset
    const payload = { sub: user._id, email: user.email, type: 'password_reset' };
    const resetToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return {
      message: 'Password reset code verified. You can now set a new password.',
      token: resetToken,
    };
  }

  /**
   * Reset password with verified code
   */
  async resetPasswordWithCode(resetDto: ResetPasswordWithCodeDto): Promise<{ message: string }> {
    const { email, code, newPassword } = resetDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.passwordResetCode || !user.passwordResetCodeExpires) {
      throw new BadRequestException('No password reset code found. Please request a new one.');
    }

    if (user.passwordResetCodeExpires < new Date()) {
      throw new BadRequestException('Password reset code has expired. Please request a new one.');
    }

    if (user.passwordResetCode !== code) {
      throw new BadRequestException('Invalid password reset code');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset code
    user.password = hashedPassword;
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpires = undefined;
    await user.save();

    return {
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Change user password (requires current password verification)
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters long');
    }

    // Check if new password is different from old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password changed successfully',
    };
  }

  async getWorkersWithLocation(): Promise<
    Array<{
      id: string;
      fullName: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      phone?: string;
      work?: string;
      profilePicture?: string;
      cvUrl?: string;
      yearsOfExperience?: number;
      skills?: string[];
      certificates?: string[];
      aboutMe?: string;
      profileCompletionPercentage?: number;
      isFaceVerified?: boolean;
    }>
  > {
    const workers = await this.userModel
      .find({
        role: UserRole.WORKER,
        isActive: true,
        isEmailVerified: true,
      })
      .select('fullName address latitude longitude phone work profilePicture cvUrl yearsOfExperience skills certificates aboutMe profileCompletionPercentage isFaceVerified');

    return workers
      .filter(
        (worker) =>
          worker.latitude !== undefined &&
          worker.longitude !== null &&
          worker.latitude !== null &&
          worker.longitude !== null,
      )
      .map((worker) => ({
        id: (worker as any)._id.toString(),
        fullName: worker.fullName,
        address: worker.address,
        latitude: worker.latitude,
        longitude: worker.longitude,
        phone: worker.phone,
        work: worker.work,
        profilePicture: worker.profilePicture,
        cvUrl: worker.cvUrl,
        yearsOfExperience: worker.yearsOfExperience,
        skills: worker.skills,
        certificates: worker.certificates,
        aboutMe: worker.aboutMe,
        profileCompletionPercentage: worker.profileCompletionPercentage,
        isFaceVerified: worker.isFaceVerified,
      }));
  }

  async getWorkersByCategory(category: string): Promise<any[]> {
    const workers = await this.userModel
      .find({
        role: 'worker',
        isEmailVerified: true,
        work: { $regex: new RegExp(`^${category}$`, 'i') }, // Case-insensitive exact match
      })
      .select('fullName address latitude longitude phone work profilePicture cvUrl yearsOfExperience skills certificates aboutMe profileCompletionPercentage isFaceVerified')
      .exec();

    return workers
      .filter(
        (worker) =>
          worker.latitude !== undefined &&
          worker.longitude !== undefined &&
          worker.latitude !== null &&
          worker.longitude !== null,
      )
      .map((worker) => ({
        id: (worker as any)._id.toString(),
        fullName: worker.fullName,
        address: worker.address,
        latitude: worker.latitude,
        longitude: worker.longitude,
        phone: worker.phone,
        work: worker.work,
        profilePicture: worker.profilePicture,
        cvUrl: worker.cvUrl,
        yearsOfExperience: worker.yearsOfExperience,
        skills: worker.skills,
        certificates: worker.certificates,
        aboutMe: worker.aboutMe,
        profileCompletionPercentage: worker.profileCompletionPercentage,
        isFaceVerified: worker.isFaceVerified,
      }));
  }

  async updateWorkerProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.WORKER) {
      throw new BadRequestException('Only workers can complete profile');
    }

    // Update fields
    if (updateProfileDto.yearsOfExperience !== undefined) {
      user.yearsOfExperience = updateProfileDto.yearsOfExperience;
    }
    if (updateProfileDto.skills !== undefined) {
      user.skills = updateProfileDto.skills;
    }
    if (updateProfileDto.certificates !== undefined) {
      user.certificates = updateProfileDto.certificates;
    }
    if (updateProfileDto.aboutMe !== undefined) {
      user.aboutMe = updateProfileDto.aboutMe;
    }

    // Calculate profile completion percentage
    // Base: 50% (account created)
    let completionPercentage = 50;
    
    if (user.yearsOfExperience !== undefined && user.yearsOfExperience > 0) {
      completionPercentage += 10;
    }
    if (user.skills && user.skills.length > 0) {
      completionPercentage += 15;
    }
    if (user.certificates && user.certificates.length > 0) {
      completionPercentage += 15;
    }
    if (user.aboutMe && user.aboutMe.trim().length > 0) {
      completionPercentage += 10;
    }

    user.profileCompletionPercentage = completionPercentage;

    await user.save();

    return {
      profileCompletionPercentage: user.profileCompletionPercentage,
      yearsOfExperience: user.yearsOfExperience,
      skills: user.skills,
      certificates: user.certificates,
      aboutMe: user.aboutMe,
    };
  }

  /**
   * Submit KYC documents for verification
   */
  async submitKyc(userId: string, selfieUrl: string, idFrontUrl: string, idBackUrl: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.WORKER) {
      throw new BadRequestException('Only workers need KYC verification');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    if (user.kycStatus === 'approved') {
      throw new BadRequestException('KYC already approved');
    }

    if (user.kycStatus === 'pending') {
      throw new BadRequestException('KYC verification is already pending');
    }

    user.selfieUrl = selfieUrl;
    user.idFrontUrl = idFrontUrl;
    user.idBackUrl = idBackUrl;
    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();
    user.kycRejectionReason = undefined;

    await user.save();

    return {
      message: 'KYC documents submitted successfully. Please wait for admin verification.',
    };
  }

  /**
   * Get KYC status for a user
   */
  async getKycStatus(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).select('kycStatus kycSubmittedAt kycVerifiedAt kycRejectionReason');
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      kycStatus: user.kycStatus || 'not_submitted',
      kycSubmittedAt: user.kycSubmittedAt,
      kycVerifiedAt: user.kycVerifiedAt,
      kycRejectionReason: user.kycRejectionReason,
    };
  }

  /**
   * Verify email for workers - returns requiresKyc flag instead of token
   */
  async verifyEmailForWorker(verifyEmailDto: VerifyEmailDto): Promise<{ requiresKyc: boolean; email: string; message: string }> {
    const { email, code } = verifyEmailDto;

    const user = await this.userModel.findOne({ email });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (!user.emailVerificationCode || !user.emailVerificationCodeExpires) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (user.emailVerificationCodeExpires < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    if (user.emailVerificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    // Verify the user's email
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationCodeExpires = undefined;
    await user.save();

    // For workers, don't return token - they need KYC first
    if (user.role === UserRole.WORKER) {
      return {
        requiresKyc: true,
        email: user.email,
        message: 'Email verified successfully. Please complete KYC verification to continue.',
      };
    }

    // For customers, proceed normally (this shouldn't be called for customers)
    return {
      requiresKyc: false,
      email: user.email,
      message: 'Email verified successfully.',
    };
  }

  /**
   * Login after KYC approval (for workers)
   */
  async loginAfterKyc(email: string): Promise<{ user: any; token: string }> {
    const user = await this.userModel.findOne({ email });
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    if (user.role === UserRole.WORKER && user.kycStatus !== 'approved') {
      throw new UnauthorizedException('KYC verification is required for workers');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // Generate JWT token
    const payload = { sub: user._id, email: user.email, role: user.role };
    const token = this.jwtService.sign(payload);

    const userResponse = {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      kycStatus: user.kycStatus,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      lastLoginAt: user.lastLoginAt,
      profileCompletionPercentage: user.profileCompletionPercentage,
    };

    return { user: userResponse, token };
  }
}