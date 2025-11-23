import { Injectable, NotFoundException } from '@nestjs/common';
import { Booking, Payment, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentResponse } from './dto/payment.response';

type PaymentWithBooking = Payment & { booking: Booking };

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreatePaymentDto): Promise<PaymentResponse> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: payload.bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const payment = await this.prisma.payment.create({
      data: {
        bookingId: payload.bookingId,
        amount: new Prisma.Decimal(payload.amount),
        currency: payload.currency.toUpperCase(),
        status: payload.status,
        provider: payload.provider.toUpperCase(),
        providerPaymentId: payload.providerPaymentId
          ? payload.providerPaymentId.toUpperCase()
          : null,
        clientSecret: payload.clientSecret ?? null,
      },
      include: { booking: true },
    });

    return this.mapPayment(payment);
  }

  private mapPayment(payment: PaymentWithBooking): PaymentResponse {
    return {
      id: payment.id,
      bookingId: payment.bookingId,
      amount: payment.amount.toNumber(),
      currency: payment.currency,
      status: payment.status,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? undefined,
      clientSecret: payment.clientSecret ?? undefined,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
