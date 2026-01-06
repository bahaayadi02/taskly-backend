import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceStatus, PaymentMethod } from '../schemas/invoice.schema';
import { Booking, BookingDocument } from '../schemas/booking.schema';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
  ) {}

  // Generate unique invoice number
  private generateInvoiceNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  }

  // Create invoice from booking
  async createInvoiceFromBooking(bookingId: string): Promise<Invoice> {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate('customerId', 'fullName email')
      .populate('workerId', 'fullName email');

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const amount = booking.finalCost || booking.estimatedCost || 0;
    const tax = amount * 0.19; // 19% TVA
    const totalAmount = amount + tax;

    // Check if invoice already exists
    const existingInvoice = await this.invoiceModel.findOne({ bookingId });
    if (existingInvoice) {
      // Update existing invoice with new amounts if not yet paid
      if (existingInvoice.status !== InvoiceStatus.PAID) {
        existingInvoice.amount = amount;
        existingInvoice.tax = tax;
        existingInvoice.totalAmount = totalAmount;
        return existingInvoice.save();
      }
      return existingInvoice;
    }

    const invoice = new this.invoiceModel({
      bookingId: booking._id,
      customerId: booking.customerId,
      workerId: booking.workerId,
      invoiceNumber: this.generateInvoiceNumber(),
      serviceType: booking.serviceType,
      serviceDescription: booking.jobDescription,
      amount,
      tax,
      discount: 0,
      totalAmount,
      status: InvoiceStatus.PENDING,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return invoice.save();
  }

  // Process payment
  async processPayment(
    invoiceId: string,
    paymentMethod: PaymentMethod,
  ): Promise<Invoice> {
    const invoice = await this.invoiceModel.findById(invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Invoice already paid');
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paymentMethod = paymentMethod;
    invoice.paidAt = new Date();

    // Update booking payment status
    await this.bookingModel.findByIdAndUpdate(invoice.bookingId, {
      paymentStatus: 'paid',
      paymentMethod,
      paidAt: new Date(),
    });

    return invoice.save();
  }

  // Get worker's invoices
  async getWorkerInvoices(workerId: string): Promise<Invoice[]> {
    return this.invoiceModel
      .find({ workerId: new Types.ObjectId(workerId) })
      .populate('customerId', 'fullName email profilePicture')
      .populate('bookingId', 'serviceType scheduledDate')
      .sort({ createdAt: -1 });
  }

  // Get customer's invoices
  async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    return this.invoiceModel
      .find({ customerId: new Types.ObjectId(customerId) })
      .populate('workerId', 'fullName email profilePicture work')
      .populate('bookingId', 'serviceType scheduledDate')
      .sort({ createdAt: -1 });
  }

  // Get invoice by ID
  async getInvoiceById(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findById(invoiceId)
      .populate('customerId', 'fullName email phone address')
      .populate('workerId', 'fullName email phone work')
      .populate('bookingId');

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  // Get invoice by booking ID
  async getInvoiceByBookingId(bookingId: string): Promise<Invoice> {
    const invoice = await this.invoiceModel
      .findOne({ bookingId: new Types.ObjectId(bookingId) })
      .populate('customerId', 'fullName email phone address')
      .populate('workerId', 'fullName email phone work')
      .populate('bookingId');

    if (!invoice) {
      throw new NotFoundException('Invoice not found for this booking');
    }

    return invoice;
  }

  // Get worker's monthly revenue
  async getWorkerMonthlyRevenue(workerId: string, year?: number, month?: number): Promise<any> {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month || now.getMonth() + 1;

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const invoices = await this.invoiceModel.find({
      workerId: new Types.ObjectId(workerId),
      status: InvoiceStatus.PAID,
      paidAt: { $gte: startDate, $lte: endDate },
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalServices = invoices.length;
    const averagePerService = totalServices > 0 ? totalRevenue / totalServices : 0;

    // Get revenue by payment method
    const byPaymentMethod = invoices.reduce((acc, inv) => {
      const method = inv.paymentMethod || 'unknown';
      acc[method] = (acc[method] || 0) + inv.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    return {
      year: targetYear,
      month: targetMonth,
      totalRevenue,
      totalServices,
      averagePerService,
      byPaymentMethod,
      invoices: invoices.map(inv => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.totalAmount,
        paidAt: inv.paidAt,
        serviceType: inv.serviceType,
      })),
    };
  }

  // Get worker's yearly revenue summary
  async getWorkerYearlyRevenue(workerId: string, year?: number): Promise<any> {
    const targetYear = year || new Date().getFullYear();
    const monthlyData: { month: number; revenue: number; services: number }[] = [];

    for (let month = 1; month <= 12; month++) {
      const data = await this.getWorkerMonthlyRevenue(workerId, targetYear, month);
      monthlyData.push({
        month,
        revenue: data.totalRevenue,
        services: data.totalServices,
      });
    }

    const totalYearRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalYearServices = monthlyData.reduce((sum, m) => sum + m.services, 0);

    return {
      year: targetYear,
      totalRevenue: totalYearRevenue,
      totalServices: totalYearServices,
      monthlyBreakdown: monthlyData,
    };
  }
}
