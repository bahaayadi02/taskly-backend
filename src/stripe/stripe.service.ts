import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      console.warn('⚠️ STRIPE_SECRET_KEY not configured - Stripe payments will fail');
    }
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2025-11-17.clover' as any,
    });
  }

  // Create a payment intent for a booking
  async createPaymentIntent(
    amount: number,
    currency: string = 'tnd',
    bookingId: string,
    customerId: string,
    workerId: string,
    metadata?: Record<string, string>,
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      // Amount should be in smallest currency unit (millimes for TND)
      const amountInSmallestUnit = Math.round(amount * 1000);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: currency.toLowerCase(),
        metadata: {
          bookingId,
          customerId,
          workerId,
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      console.error('Stripe createPaymentIntent error:', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  // Confirm payment was successful
  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status === 'succeeded';
    } catch (error) {
      console.error('Stripe confirmPayment error:', error);
      return false;
    }
  }

  // Get payment intent details
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent | null> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      console.error('Stripe getPaymentIntent error:', error);
      return null;
    }
  }

  // Create a refund
  async createRefund(
    paymentIntentId: string,
    amount?: number,
  ): Promise<Stripe.Refund | null> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        refundParams.amount = Math.round(amount * 1000);
      }

      return await this.stripe.refunds.create(refundParams);
    } catch (error) {
      console.error('Stripe createRefund error:', error);
      return null;
    }
  }

  // Get publishable key for client
  getPublishableKey(): string {
    return process.env.STRIPE_PUBLISHABLE_KEY || '';
  }
}
