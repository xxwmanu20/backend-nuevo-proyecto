import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  const findBookingMock = jest.fn();
  const createPaymentMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              findUnique: findBookingMock,
            },
            payment: {
              create: createPaymentMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws NotFoundException when booking does not exist before creating a payment', async () => {
    const dto: CreatePaymentDto = {
      bookingId: 77,
      amount: 120,
      currency: 'usd',
      status: PaymentStatus.SUCCEEDED,
      provider: 'stripe',
    };
    findBookingMock.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);

    expect(findBookingMock).toHaveBeenCalledWith({ where: { id: 77 } });
    expect(createPaymentMock).not.toHaveBeenCalled();
  });

  it('creates a payment when the booking exists and normalizes fields', async () => {
    const dto: CreatePaymentDto = {
      bookingId: 11,
      amount: 199.99,
      currency: 'usd',
      status: PaymentStatus.REQUIRES_CONFIRMATION,
      provider: 'stripe',
      providerPaymentId: 'pi_123',
      clientSecret: 'secret_abc',
    };

    findBookingMock.mockResolvedValue({ id: 11 });
    createPaymentMock.mockResolvedValue({
      id: 55,
      bookingId: 11,
      amount: new Prisma.Decimal(dto.amount),
      currency: 'USD',
      status: PaymentStatus.REQUIRES_CONFIRMATION,
      provider: 'STRIPE',
      providerPaymentId: 'PI_123',
      clientSecret: 'secret_abc',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      booking: { id: 11 },
    });

    const result = await service.create(dto);

    expect(findBookingMock).toHaveBeenCalledWith({ where: { id: 11 } });
    expect(createPaymentMock).toHaveBeenCalledWith({
      data: {
        bookingId: 11,
        amount: new Prisma.Decimal(dto.amount),
        currency: 'USD',
        status: PaymentStatus.REQUIRES_CONFIRMATION,
        provider: 'STRIPE',
        providerPaymentId: 'PI_123',
        clientSecret: 'secret_abc',
      },
      include: { booking: true },
    });

    expect(result).toEqual({
      id: 55,
      bookingId: 11,
      amount: 199.99,
      currency: 'USD',
      status: PaymentStatus.REQUIRES_CONFIRMATION,
      provider: 'STRIPE',
      providerPaymentId: 'PI_123',
      clientSecret: 'secret_abc',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    expect(typeof result.amount).toBe('number');
  });
});
