import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { PaymentStatus } from '@prisma/client';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let app: INestApplication;
  const createMock = jest.fn();

  const validPayload = {
    bookingId: 1,
    amount: 150,
    currency: 'usd',
    status: PaymentStatus.SUCCEEDED,
    provider: 'stripe',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: {
            create: createMock,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  it('returns 201 and forwards normalized payload to PaymentsService', async () => {
    const serviceResponse = {
      id: 42,
      bookingId: 1,
      amount: 150,
      currency: 'USD',
      status: PaymentStatus.SUCCEEDED,
      provider: 'STRIPE',
      providerPaymentId: undefined,
      clientSecret: undefined,
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
    } as const;

    createMock.mockResolvedValue(serviceResponse);

    await request(app.getHttpServer())
      .post('/payments')
      .send(validPayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "amount": 150,
  "bookingId": 1,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "currency": "USD",
  "id": 42,
  "provider": "STRIPE",
  "status": "SUCCEEDED",
  "updatedAt": "2025-01-01T00:00:00.000Z",
}
`);
      });

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: 1,
        amount: 150,
        currency: 'USD',
        status: PaymentStatus.SUCCEEDED,
        provider: 'STRIPE',
      }),
    );
  });

  it('propagates NotFoundException from PaymentsService', async () => {
    createMock.mockRejectedValue(new NotFoundException('Booking not found'));

    await request(app.getHttpServer())
      .post('/payments')
      .send(validPayload)
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "error": "Not Found",
  "message": "Booking not found",
  "statusCode": 404,
}
`);
      });
  });

  it('returns 400 and does not call service when payload fails validation', async () => {
    await request(app.getHttpServer())
      .post('/payments')
      .send({ ...validPayload, currency: 'us' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "error": "Bad Request",
  "message": [
    "currency must be longer than or equal to 3 characters",
  ],
  "statusCode": 400,
}
`);
      });

    expect(createMock).not.toHaveBeenCalled();
  });
});
