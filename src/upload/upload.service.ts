import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async updateProfilePicture(userId: string, filename: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old profile picture if exists
    if (user.profilePicture) {
      const oldFilename = user.profilePicture.split('/').pop();
      if (oldFilename) {
        const oldPath = join(process.cwd(), 'uploads', 'profiles', oldFilename);
        if (existsSync(oldPath)) {
          try {
            unlinkSync(oldPath);
          } catch (error) {
            console.error('Failed to delete old profile picture:', error);
          }
        }
      }
    }

    // Update user with new profile picture URL
    const profilePictureUrl = `/uploads/profiles/${filename}`;
    user.profilePicture = profilePictureUrl;
    await user.save();

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      profilePicture: user.profilePicture,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
    };
  }

  async deleteProfilePicture(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete profile picture file if exists
    if (user.profilePicture) {
      const filename = user.profilePicture.split('/').pop();
      if (filename) {
        const filePath = join(process.cwd(), 'uploads', 'profiles', filename);
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (error) {
            console.error('Failed to delete profile picture:', error);
          }
        }
      }
    }

    user.profilePicture = undefined;
    await user.save();

    return {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      profilePicture: null,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
    };
  }

  async updateKycDocuments(
    userIdOrEmail: string,
    selfieUrl: string,
    idFrontUrl: string,
    idBackUrl: string,
  ): Promise<any> {
    // Find user by ID or email
    let user: UserDocument | null = null;
    
    // Check if it's a valid ObjectId first
    if (Types.ObjectId.isValid(userIdOrEmail)) {
      user = await this.userModel.findById(userIdOrEmail);
    }
    
    // If not found by ID, try by email
    if (!user) {
      user = await this.userModel.findOne({ email: userIdOrEmail.toLowerCase() });
    }
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete old KYC files if they exist
    const oldFiles = [user.selfieUrl, user.idFrontUrl, user.idBackUrl];
    for (const oldUrl of oldFiles) {
      if (oldUrl) {
        const filename = oldUrl.split('/').pop();
        if (filename) {
          const filePath = join(process.cwd(), 'uploads', 'kyc', filename);
          if (existsSync(filePath)) {
            try {
              unlinkSync(filePath);
            } catch (error) {
              console.error('Failed to delete old KYC file:', error);
            }
          }
        }
      }
    }

    // Update user's KYC documents
    user.selfieUrl = selfieUrl;
    user.idFrontUrl = idFrontUrl;
    user.idBackUrl = idBackUrl;
    user.kycStatus = 'pending';
    user.kycSubmittedAt = new Date();
    
    await user.save();

    console.log(`📋 [KYC] Documents uploaded for user ${user.email}, status: pending`);

    return {
      kycStatus: user.kycStatus,
      kycSubmittedAt: user.kycSubmittedAt,
    };
  }
}
