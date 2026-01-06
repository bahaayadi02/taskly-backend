import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StripeService } from './stripe.service';
import { BookingsService } from '../bookings/bookings.service';
import { BookingStatus, PaymentMethod } from '../schemas/booking.schema';

class CreatePaymentIntentDto {
  bookingId: string;
  tip?: number;
}

@Controller('api/v1/stripe')
@UseGuards(JwtAuthGuard)
export class StripeController {
  constructor(
    private stripeService: StripeService,
    private bookingsService: BookingsService,
  ) {}

  // Get Stripe publishable key
  @Get('config')
  getConfig() {
    return {
      success: true,
      data: {
        publishableKey: this.stripeService.getPublishableKey(),
      },
    };
  }

  // Create payment intent for a booking
  @Post('create-payment-intent')
  async createPaymentIntent(
    @Request() req,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    const userId = req.user.userId;
    
    // Get booking details
    const booking = await this.bookingsService.findOne(dto.bookingId, userId);
    
    // Verify booking is in work_finished status
    if (booking.status !== BookingStatus.WORK_FINISHED) {
      return {
        success: false,
        message: 'Le travail doit être terminé avant le paiement',
      };
    }

    // Verify user is the customer
    if (booking.customerId._id.toString() !== userId) {
      return {
        success: false,
        message: 'Seul le client peut effectuer le paiement',
      };
    }

    // Calculate total amount
    const baseAmount = booking.finalCost || booking.estimatedCost || 0;
    const tipAmount = dto.tip || 0;
    const totalAmount = baseAmount + tipAmount;

    if (totalAmount <= 0) {
      return {
        success: false,
        message: 'Le montant doit être supérieur à 0',
      };
    }

    // Create payment intent
    const { clientSecret, paymentIntentId } = await this.stripeService.createPaymentIntent(
      totalAmount,
      'tnd',
      dto.bookingId,
      userId,
      booking.workerId._id.toString(),
      {
        serviceType: booking.serviceType,
        tip: tipAmount.toString(),
      },
    );

    return {
      success: true,
      data: {
        clientSecret,
        paymentIntentId,
        amount: totalAmount,
        currency: 'TND',
      },
    };
  }

  // Confirm payment and update booking
  @Post('confirm-payment/:bookingId')
  async confirmPayment(
    @Request() req,
    @Param('bookingId') bookingId: string,
    @Body() body: { paymentIntentId: string; tip?: number },
  ) {
    const userId = req.user.userId;

    // Verify payment with Stripe
    const isPaymentSuccessful = await this.stripeService.confirmPayment(body.paymentIntentId);

    if (!isPaymentSuccessful) {
      return {
        success: false,
        message: 'Le paiement n\'a pas été confirmé',
      };
    }

    // Process payment in booking service (this will mark as completed)
    const updatedBooking = await this.bookingsService.processPayment(
      bookingId,
      userId,
      {
        paymentMethod: PaymentMethod.CARD,
        tip: body.tip,
        stripePaymentIntentId: body.paymentIntentId,
      },
    );

    return {
      success: true,
      message: 'Paiement confirmé avec succès',
      data: updatedBooking,
    };
  }
}
