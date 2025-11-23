import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { generateKeyPairSync } from 'crypto';
import { sign } from 'jsonwebtoken';
import * as request from 'supertest';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';
import { JwtKeyService } from '../../src/auth/jwt-key.service';
import { JwtStrategy } from '../../src/auth/jwt.strategy';
import { RolesGuard } from '../../src/auth/roles.guard';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BookingsController } from '../../src/bookings/bookings.controller';
import { BookingsService } from '../../src/bookings/bookings.service';
import { PaymentsController } from '../../src/payments/payments.controller';
import { PaymentsService } from '../../src/payments/payments.service';
import { ServicesController } from '../../src/services/services.controller';
import { ServicesService } from '../../src/services/services.service';

const bookingResponse = {
  id: 1,
  status: 'PENDING',
  scheduledAt: '2025-01-01T10:00:00.000Z',
  service: {
    id: 2,
    name: 'Test Service',
    description: 'Desc',
  },
};

const paymentResponse = {
  id: 9,
  bookingId: 1,
  amount: 100,
  currency: 'USD',
  status: 'SUCCEEDED',
  provider: 'STRIPE',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const servicesResponse = [
  {
    id: 1,
    name: 'Service',
    description: 'Desc',
    basePrice: 100,
  },
];

describe('Auth Guards integration', () => {
  let app: INestApplication;
  let bookingsListMock: jest.Mock;
  let bookingsDetailMock: jest.Mock;
  let bookingsCreateMock: jest.Mock;
  let paymentsCreateMock: jest.Mock;
  let servicesListMock: jest.Mock;
  let privateKey: string;
  let publicKey: string;

  const createToken = (role: UserRole): string =>
    sign(
      {
        sub: '1',
        userId: 1,
        email: 'user@example.com',
        role,
      },
      privateKey,
      {
        algorithm: 'RS256',
        expiresIn: '1h',
      },
    );

  beforeAll(() => {
    const pair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  });

  beforeEach(async () => {
    bookingsCreateMock = jest.fn().mockResolvedValue(bookingResponse);
    bookingsListMock = jest.fn().mockResolvedValue([bookingResponse]);
    bookingsDetailMock = jest.fn().mockResolvedValue(bookingResponse);
    paymentsCreateMock = jest.fn().mockResolvedValue(paymentResponse);
    servicesListMock = jest.fn().mockResolvedValue(servicesResponse);

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [BookingsController, PaymentsController, ServicesController],
      providers: [
        Reflector,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        {
          provide: JwtKeyService,
          useValue: {
            getPrivateKey: () => privateKey,
            getPublicKey: () => publicKey,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              if (key === 'app.jwt.expiresIn') {
                return '1h';
              }

              return defaultValue;
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: BookingsService,
          useValue: {
            create: bookingsCreateMock,
            list: bookingsListMock,
            detail: bookingsDetailMock,
          },
        },
        {
          provide: PaymentsService,
          useValue: {
            create: paymentsCreateMock,
          },
        },
        {
          provide: ServicesService,
          useValue: {
            list: servicesListMock,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects requests without Authorization header', async () => {
    await request(app.getHttpServer()).get('/bookings').expect(401);

    expect(bookingsListMock).not.toHaveBeenCalled();
  });

  it('rejects services access without token', async () => {
    await request(app.getHttpServer()).get('/services').expect(401);

    expect(servicesListMock).not.toHaveBeenCalled();
  });

  it('allows access to bookings for customer role', async () => {
    const token = createToken(UserRole.CUSTOMER);

    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual([bookingResponse]);
      });

    expect(bookingsListMock).toHaveBeenCalledTimes(1);
  });

  it('denies access to bookings for professional role', async () => {
    const token = createToken(UserRole.PROFESSIONAL);

    await request(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(bookingsListMock).not.toHaveBeenCalled();
  });

  it('allows payments creation only for admin role', async () => {
    const adminToken = createToken(UserRole.ADMIN);

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        bookingId: 1,
        amount: 100,
        currency: 'usd',
        status: 'SUCCEEDED',
        provider: 'stripe',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual(paymentResponse);
      });

    expect(paymentsCreateMock).toHaveBeenCalledTimes(1);

    const customerToken = createToken(UserRole.CUSTOMER);

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        bookingId: 1,
        amount: 100,
        currency: 'usd',
        status: 'SUCCEEDED',
        provider: 'stripe',
      })
      .expect(403);

    expect(paymentsCreateMock).toHaveBeenCalledTimes(1);
  });

  it('allows services list for professional role', async () => {
    const token = createToken(UserRole.PROFESSIONAL);

    await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(servicesResponse);
      });

    expect(servicesListMock).toHaveBeenCalledTimes(1);
  });

  it('allows services list for admin role', async () => {
    const token = createToken(UserRole.ADMIN);

    await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toEqual(servicesResponse);
      });

    expect(servicesListMock).toHaveBeenCalledTimes(1);
  });
});
