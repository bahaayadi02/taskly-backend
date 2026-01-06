import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum UserRole {
  CUSTOMER = 'customer',
  WORKER = 'worker',
  ADMIN = 'admin',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, trim: true })
  phone: string;

  @Prop({ required: true, enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;

  // Track if user is originally a worker (can switch between worker/customer)
  @Prop({ default: false })
  isWorkerAccount: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  emailVerificationToken?: string;

  @Prop()
  emailVerificationCode?: string;

  @Prop()
  emailVerificationCodeExpires?: Date;

  @Prop()
  passwordResetToken?: string;

  @Prop()
  passwordResetExpires?: Date;

  @Prop()
  passwordResetCode?: string;

  @Prop()
  passwordResetCodeExpires?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  profilePicture?: string;

  @Prop({ trim: true })
  address?: string;

  @Prop()
  latitude?: number;

  @Prop()
  longitude?: number;

  @Prop({ trim: true })
  work?: string;

  @Prop({ trim: true })
  cvUrl?: string; // URL to uploaded CV (Image format: JPG, PNG, GIF, etc. for workers)

  // Worker profile completion fields
  @Prop()
  yearsOfExperience?: number;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ type: [String], default: [] })
  certificates?: string[]; // Array of certificate image URLs

  @Prop({ trim: true })
  aboutMe?: string;

  @Prop({ default: 50 })
  profileCompletionPercentage?: number;

  // Face verification for workers
  @Prop({ default: false })
  isFaceVerified?: boolean;

  @Prop()
  faceVerifiedAt?: Date;

  // KYC Verification fields (for workers)
  @Prop({ 
    type: String, 
    enum: ['not_submitted', 'pending', 'approved', 'rejected'], 
    default: 'not_submitted' 
  })
  kycStatus?: string;

  @Prop()
  selfieUrl?: string;

  @Prop()
  idFrontUrl?: string;

  @Prop()
  idBackUrl?: string;

  @Prop()
  kycSubmittedAt?: Date;

  @Prop()
  kycVerifiedAt?: Date;

  @Prop()
  kycVerifiedBy?: string;

  @Prop()
  kycRejectionReason?: string;

  // Social login fields
  @Prop()
  googleId?: string;

  @Prop()
  facebookId?: string;

  // Favorite workers (for customers)
  @Prop({ type: [String], default: [] })
  favoriteWorkers?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
