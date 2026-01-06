import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, UserRole } from '../schemas/user.schema';
import { Booking, BookingDocument, BookingStatus, PaymentStatus } from '../schemas/booking.schema';
import { Review, ReviewDocument } from '../schemas/review.schema';
import { Message, MessageDocument } from '../schemas/message.schema';
import { Notification, NotificationDocument } from '../schemas/notification.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) {}

  // Dashboard Stats
  async getDashboardStats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalCustomers,
      totalWorkers,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      confirmedBookings,
      inProgressBookings,
      newUsersThisMonth,
      bookingsThisMonth,
      paidBookings,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: UserRole.CUSTOMER }),
      this.userModel.countDocuments({ role: UserRole.WORKER }),
      this.bookingModel.countDocuments(),
      this.bookingModel.countDocuments({ status: BookingStatus.PENDING }),
      this.bookingModel.countDocuments({ status: BookingStatus.COMPLETED }),
      this.bookingModel.countDocuments({ status: BookingStatus.CANCELLED }),
      this.bookingModel.countDocuments({ status: BookingStatus.CONFIRMED }),
      this.bookingModel.countDocuments({ status: BookingStatus.IN_PROGRESS }),
      this.userModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.bookingModel.countDocuments({ createdAt: { $gte: startOfMonth } }),
      this.bookingModel.find({ paymentStatus: PaymentStatus.PAID }).select('finalCost estimatedCost'),
    ]);

    const totalRevenue = paidBookings.reduce((sum, b) => sum + (b.finalCost || b.estimatedCost || 0), 0);

    return {
      totalUsers,
      totalCustomers,
      totalWorkers,
      totalBookings,
      pendingBookings,
      completedBookings,
      cancelledBookings,
      confirmedBookings,
      inProgressBookings,
      newUsersThisMonth,
      bookingsThisMonth,
      totalRevenue,
    };
  }


  // Get all users with pagination
  async getAllUsers(page = 1, limit = 50, role?: string, search?: string) {
    const query: any = {};
    
    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(query),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Get all workers
  async getAllWorkers(page = 1, limit = 50, category?: string, search?: string) {
    const query: any = { role: UserRole.WORKER };
    
    if (category && category !== 'All') {
      query.work = { $regex: category, $options: 'i' };
    }
    
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { work: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
      ];
    }

    const [workers, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(query),
    ]);

    // Get stats for each worker
    const workersWithStats = await Promise.all(
      workers.map(async (worker) => {
        const [bookingStats, reviewStats] = await Promise.all([
          this.bookingModel.aggregate([
            { $match: { workerId: worker._id } },
            {
              $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                completedBookings: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                totalEarnings: {
                  $sum: {
                    $cond: [{ $eq: ['$paymentStatus', 'paid'] }, { $ifNull: ['$finalCost', '$estimatedCost'] }, 0],
                  },
                },
              },
            },
          ]),
          this.reviewModel.aggregate([
            { $match: { workerId: worker._id } },
            {
              $group: {
                _id: null,
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
              },
            },
          ]),
        ]);

        return {
          ...worker.toObject(),
          stats: {
            totalBookings: bookingStats[0]?.totalBookings || 0,
            completedBookings: bookingStats[0]?.completedBookings || 0,
            totalEarnings: bookingStats[0]?.totalEarnings || 0,
            averageRating: reviewStats[0]?.averageRating || 0,
            totalReviews: reviewStats[0]?.totalReviews || 0,
          },
        };
      })
    );

    return { workers: workersWithStats, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Get all bookings
  async getAllBookings(page = 1, limit = 50, status?: string, search?: string) {
    const query: any = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const [bookings, total] = await Promise.all([
      this.bookingModel
        .find(query)
        .populate('customerId', 'fullName email phone profilePicture')
        .populate('workerId', 'fullName email phone profilePicture work')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.bookingModel.countDocuments(query),
    ]);

    return { bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Get booking stats by status
  async getBookingStats() {
    const stats = await this.bookingModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      on_the_way: 0,
      in_progress: 0,
      work_finished: 0,
      completed: 0,
      cancelled: 0,
      rejected: 0,
    };

    stats.forEach((s) => {
      result[s._id] = s.count;
    });

    return result;
  }

  // Get all reviews
  async getAllReviews(page = 1, limit = 50, rating?: number) {
    const query: any = {};
    
    if (rating) {
      query.rating = rating;
    }

    const [reviews, total, stats] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('customerId', 'fullName email profilePicture')
        .populate('workerId', 'fullName email profilePicture work')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.reviewModel.countDocuments(query),
      this.reviewModel.aggregate([
        {
          $group: {
            _id: null,
            averageRating: { $avg: '$rating' },
            totalReviews: { $sum: 1 },
            fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            withResponse: { $sum: { $cond: [{ $ne: ['$workerResponse', null] }, 1, 0] } },
          },
        },
      ]),
    ]);

    return {
      reviews,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: stats[0] || {
        averageRating: 0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
        withResponse: 0,
      },
    };
  }

  // Update user status
  async updateUserStatus(userId: string, isActive: boolean) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');
  }

  // Update booking status
  async updateBookingStatus(bookingId: string, status: BookingStatus) {
    return this.bookingModel
      .findByIdAndUpdate(bookingId, { status }, { new: true })
      .populate('customerId', 'fullName email phone')
      .populate('workerId', 'fullName email phone work');
  }


  // ==================== KYC MANAGEMENT ====================

  // Get pending KYC verifications
  async getPendingKycVerifications(page = 1, limit = 50) {
    const query = { 
      role: UserRole.WORKER, 
      kycStatus: 'pending' 
    };

    const [workers, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('fullName email phone address work selfieUrl idFrontUrl idBackUrl kycSubmittedAt createdAt')
        .sort({ kycSubmittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(query),
    ]);

    return { 
      workers, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit) 
    };
  }

  // Get all KYC submissions with status filter
  async getAllKycSubmissions(page = 1, limit = 50, status?: string) {
    const query: any = { 
      role: UserRole.WORKER,
      kycStatus: { $ne: 'not_submitted' }
    };
    
    if (status && status !== 'all') {
      query.kycStatus = status;
    }

    const [workers, total, stats] = await Promise.all([
      this.userModel
        .find(query)
        .select('fullName email phone address work selfieUrl idFrontUrl idBackUrl kycStatus kycSubmittedAt kycVerifiedAt kycRejectionReason createdAt')
        .sort({ kycSubmittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      this.userModel.countDocuments(query),
      this.userModel.aggregate([
        { $match: { role: UserRole.WORKER } },
        {
          $group: {
            _id: '$kycStatus',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const kycStats = {
      not_submitted: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    stats.forEach((s) => {
      kycStats[s._id] = s.count;
    });

    return { 
      workers, 
      total, 
      page, 
      limit, 
      totalPages: Math.ceil(total / limit),
      stats: kycStats,
    };
  }

  // Approve KYC
  async approveKyc(userId: string, adminId: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.kycStatus !== 'pending') {
      throw new Error('KYC is not pending');
    }

    user.kycStatus = 'approved';
    user.kycVerifiedAt = new Date();
    user.kycVerifiedBy = adminId;
    user.kycRejectionReason = undefined;

    await user.save();

    return {
      message: 'KYC approved successfully',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        kycStatus: user.kycStatus,
      },
    };
  }

  // Reject KYC
  async rejectKyc(userId: string, adminId: string, reason: string) {
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.kycStatus !== 'pending') {
      throw new Error('KYC is not pending');
    }

    user.kycStatus = 'rejected';
    user.kycVerifiedAt = new Date();
    user.kycVerifiedBy = adminId;
    user.kycRejectionReason = reason;

    await user.save();

    return {
      message: 'KYC rejected',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        kycStatus: user.kycStatus,
        kycRejectionReason: user.kycRejectionReason,
      },
    };
  }

  // Get single KYC details
  async getKycDetails(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('fullName email phone address work profilePicture selfieUrl idFrontUrl idBackUrl kycStatus kycSubmittedAt kycVerifiedAt kycVerifiedBy kycRejectionReason createdAt');
    
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  // Get top workers
  async getTopWorkers(limit = 5) {
    const workers = await this.reviewModel.aggregate([
      {
        $group: {
          _id: '$workerId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
      { $sort: { averageRating: -1, totalReviews: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'worker',
        },
      },
      { $unwind: '$worker' },
      {
        $project: {
          _id: '$worker._id',
          fullName: '$worker.fullName',
          work: '$worker.work',
          profilePicture: '$worker.profilePicture',
          averageRating: { $round: ['$averageRating', 1] },
          totalReviews: 1,
        },
      },
    ]);

    return workers;
  }

  // Get chart data - bookings over time
  async getBookingsChartData(months = 7) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const data = await this.bookingModel.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          bookings: { $sum: 1 },
          revenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, { $ifNull: ['$finalCost', '$estimatedCost'] }, 0] },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return data.map((d) => ({
      name: monthNames[d._id.month - 1],
      bookings: d.bookings,
      revenue: d.revenue,
    }));
  }

  // Get service distribution
  async getServiceDistribution() {
    const data = await this.bookingModel.aggregate([
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const colors: Record<string, string> = {
      Electrician: '#8b5cf6',
      Plumber: '#3b82f6',
      Carpenter: '#10b981',
      Painter: '#f59e0b',
      Cleaner: '#ef4444',
      Gardener: '#22c55e',
      Mover: '#06b6d4',
      other: '#6b7280',
    };

    const total = data.reduce((sum, d) => sum + d.count, 0);

    return data.map((d) => ({
      name: d._id,
      value: total > 0 ? Math.round((d.count / total) * 100) : 0,
      color: colors[d._id] || '#6b7280',
    }));
  }
}
