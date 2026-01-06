import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { PaymentMethod } from '../schemas/invoice.schema';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('invoice/booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create invoice from booking' })
  async createInvoice(@Param('bookingId') bookingId: string) {
    try {
      const invoice = await this.paymentsService.createInvoiceFromBooking(bookingId);
      return {
        success: true,
        message: 'Invoice created successfully',
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Post('pay/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Process payment for invoice' })
  async processPayment(
    @Param('invoiceId') invoiceId: string,
    @Body() body: { paymentMethod: PaymentMethod },
  ) {
    try {
      const invoice = await this.paymentsService.processPayment(
        invoiceId,
        body.paymentMethod,
      );
      return {
        success: true,
        message: 'Payment processed successfully',
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('invoices/worker')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get worker invoices' })
  async getWorkerInvoices(@GetUser('userId') userId: string) {
    try {
      const invoices = await this.paymentsService.getWorkerInvoices(userId);
      return {
        success: true,
        message: 'Invoices retrieved successfully',
        data: invoices,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('invoices/customer')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get customer invoices' })
  async getCustomerInvoices(@GetUser('userId') userId: string) {
    try {
      const invoices = await this.paymentsService.getCustomerInvoices(userId);
      return {
        success: true,
        message: 'Invoices retrieved successfully',
        data: invoices,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('invoice/:invoiceId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get invoice details' })
  async getInvoice(@Param('invoiceId') invoiceId: string) {
    try {
      const invoice = await this.paymentsService.getInvoiceById(invoiceId);
      return {
        success: true,
        message: 'Invoice retrieved successfully',
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('invoice/booking/:bookingId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get invoice by booking ID' })
  async getInvoiceByBooking(@Param('bookingId') bookingId: string) {
    try {
      const invoice = await this.paymentsService.getInvoiceByBookingId(bookingId);
      return {
        success: true,
        message: 'Invoice retrieved successfully',
        data: invoice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('revenue/monthly')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get worker monthly revenue' })
  async getMonthlyRevenue(
    @GetUser('userId') userId: string,
    @Query('year') year?: number,
    @Query('month') month?: number,
  ) {
    try {
      const revenue = await this.paymentsService.getWorkerMonthlyRevenue(
        userId,
        year,
        month,
      );
      return {
        success: true,
        message: 'Monthly revenue retrieved successfully',
        data: revenue,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.name,
      };
    }
  }

  @Get('revenue/yearly')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get worker yearly revenue' })
  async getYearlyRevenue(
    @GetUser('userId') userId: string,
    @Query('year') year?: number,
  ) {
    try {
      const revenue = await this.paymentsService.getWorkerYearlyRevenue(userId, year);
      return {
        success: true,
        message: 'Yearly revenue retrieved successfully',
        data: revenue,
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
