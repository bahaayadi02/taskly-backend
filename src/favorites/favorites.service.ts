import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  // Get all favorite workers for a customer
  async getFavorites(customerId: string): Promise<User[]> {
    const customer = await this.userModel.findById(customerId).exec();
    
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.favoriteWorkers || customer.favoriteWorkers.length === 0) {
      return [];
    }

    // Get all favorite workers with their details
    const favoriteWorkers = await this.userModel
      .find({
        _id: { $in: customer.favoriteWorkers.map(id => new Types.ObjectId(id)) },
        role: 'worker',
        isActive: true,
      })
      .select('-password -emailVerificationToken -emailVerificationCode -passwordResetToken -passwordResetCode')
      .exec();

    return favoriteWorkers;
  }

  // Add a worker to favorites
  async addFavorite(customerId: string, workerId: string): Promise<{ message: string; favorites: string[] }> {
    // Verify worker exists
    const worker = await this.userModel.findOne({
      _id: new Types.ObjectId(workerId),
      role: 'worker',
    }).exec();

    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // Add to favorites (using $addToSet to avoid duplicates)
    const customer = await this.userModel.findByIdAndUpdate(
      customerId,
      { $addToSet: { favoriteWorkers: workerId } },
      { new: true },
    ).exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      message: 'Worker added to favorites',
      favorites: customer.favoriteWorkers || [],
    };
  }

  // Remove a worker from favorites
  async removeFavorite(customerId: string, workerId: string): Promise<{ message: string; favorites: string[] }> {
    const customer = await this.userModel.findByIdAndUpdate(
      customerId,
      { $pull: { favoriteWorkers: workerId } },
      { new: true },
    ).exec();

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      message: 'Worker removed from favorites',
      favorites: customer.favoriteWorkers || [],
    };
  }

  // Check if a worker is in favorites
  async isFavorite(customerId: string, workerId: string): Promise<boolean> {
    const customer = await this.userModel.findById(customerId).exec();
    
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer.favoriteWorkers?.includes(workerId) || false;
  }

  // Toggle favorite status
  async toggleFavorite(customerId: string, workerId: string): Promise<{ isFavorite: boolean; message: string }> {
    const isFav = await this.isFavorite(customerId, workerId);
    
    if (isFav) {
      await this.removeFavorite(customerId, workerId);
      return { isFavorite: false, message: 'Worker removed from favorites' };
    } else {
      await this.addFavorite(customerId, workerId);
      return { isFavorite: true, message: 'Worker added to favorites' };
    }
  }
}
