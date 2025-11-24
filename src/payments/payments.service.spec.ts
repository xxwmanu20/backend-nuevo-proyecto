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

  it('creates a payment without optional gateway identifiers', async () => {
    const dto: CreatePaymentDto = {
      bookingId: 22,
      amount: 50,
      currency: 'eur',
      status: PaymentStatus.SUCCEEDED,
      provider: 'paypal',
    };

    findBookingMock.mockResolvedValue({ id: 22 });
    const createdAt = new Date('2025-02-01T00:00:00.000Z');
    const updatedAt = new Date('2025-02-02T00:00:00.000Z');
    createPaymentMock.mockResolvedValue({
      id: 91,
      bookingId: 22,
      amount: new Prisma.Decimal(dto.amount),
      currency: 'EUR',
      status: PaymentStatus.SUCCEEDED,
      provider: 'PAYPAL',
      providerPaymentId: null,
      clientSecret: null,
      createdAt,
      updatedAt,
      booking: { id: 22 },
    });

    const response = await service.create(dto);

    expect(findBookingMock).toHaveBeenCalledWith({ where: { id: 22 } });
    expect(createPaymentMock).toHaveBeenCalledWith({
      data: {
        bookingId: 22,
        amount: new Prisma.Decimal(50),
        currency: 'EUR',
        status: PaymentStatus.SUCCEEDED,
        provider: 'PAYPAL',
        providerPaymentId: null,
        clientSecret: null,
      },
      include: { booking: true },
    });
    expect(response).toEqual({
      id: 91,
      bookingId: 22,
      amount: 50,
      currency: 'EUR',
      status: PaymentStatus.SUCCEEDED,
      provider: 'PAYPAL',
      providerPaymentId: undefined,
      clientSecret: undefined,
      createdAt,
      updatedAt,
    });
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
