import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, writeFileSync } from 'fs';
import { generateKeyPairSync } from 'crypto';
import { PaymentStatus, PrismaClient } from '@prisma/client';
import { tmpdir } from 'os';
import { join } from 'path';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { runSeed } from '../prisma/seed';
import { ServiceListItem } from '../src/services/dto/service.response';

/*
 * Supertest expone las respuestas como `any`, por lo que deshabilitamos la
 * regla de asignaciones inseguras únicamente en este archivo de pruebas.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

type BookingResponseJson = {
  id: number;
  status: string;
  scheduledAt: string;
  service: {
    id: number;
    name: string;
    description?: string;
  };
};

type PaymentResponseJson = {
  id: number;
  bookingId: number;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId?: string;
  clientSecret?: string;
  createdAt: string;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const assertServiceList = (value: unknown): ServiceListItem[] => {
  if (!Array.isArray(value)) {
    throw new Error('La respuesta de servicios debe ser un arreglo.');
  }

  value.forEach((item) => {
    if (!isRecord(item)) {
      throw new Error('Cada servicio debe ser un objeto.');
    }

    const { id, name, basePrice, category, offerings } = item;

    if (typeof id !== 'number' || typeof name !== 'string' || typeof basePrice !== 'number') {
      throw new Error('El servicio carece de atributos básicos.');
    }

    if (
      !isRecord(category) ||
      typeof category.id !== 'number' ||
      typeof category.name !== 'string'
    ) {
      throw new Error('El servicio debe incluir una categoría válida.');
    }

    if (!Array.isArray(offerings)) {
      throw new Error('El servicio debe exponer ofertas activas como arreglo.');
    }
  });

  return value as ServiceListItem[];
};

const assertBookingResponse = (value: unknown): BookingResponseJson => {
  if (!isRecord(value)) {
    throw new Error('La respuesta de reserva debe ser un objeto.');
  }

  const { id, status, scheduledAt, service } = value;

  if (typeof id !== 'number' || typeof status !== 'string' || typeof scheduledAt !== 'string') {
    throw new Error('La reserva recibida no contiene datos básicos válidos.');
  }

  if (!isRecord(service) || typeof service.id !== 'number' || typeof service.name !== 'string') {
    throw new Error('La reserva recibida no contiene información de servicio válida.');
  }

  return value as BookingResponseJson;
};

const assertPaymentResponse = (value: unknown): PaymentResponseJson => {
  if (!isRecord(value)) {
    throw new Error('La respuesta de pago debe ser un objeto.');
  }

  const { id, bookingId, amount, currency, status, provider, createdAt, updatedAt } = value;

  if (
    typeof id !== 'number' ||
    typeof bookingId !== 'number' ||
    typeof amount !== 'number' ||
    typeof currency !== 'string' ||
    typeof status !== 'string' ||
    typeof provider !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    throw new Error('El pago recibido no incluye los campos esperados.');
  }

  return value as PaymentResponseJson;
};

describe('API integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  const tempDir = mkdtempSync(join(tmpdir(), 'nuevo-proyecto-jwt-'));
  let customerToken: string;
  let adminToken: string;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const privateKeyPath = join(tempDir, 'jwtRS256.key');
    const publicKeyPath = join(tempDir, 'jwtRS256.key.pub');

    writeFileSync(privateKeyPath, privateKey, 'utf8');
    writeFileSync(publicKeyPath, publicKey, 'utf8');

    process.env.JWT_PRIVATE_KEY_PATH = privateKeyPath;
    process.env.JWT_PUBLIC_KEY_PATH = publicKeyPath;
  });

  beforeAll(async () => {
    prisma = new PrismaClient();
    await runSeed(prisma, { silent: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    const customerEmail = 'integration.customer@example.com';
    const customerPassword = 'StrongPass123';

    const registrationResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: customerEmail, password: customerPassword })
      .expect(201);

    customerToken = registrationResponse.body.accessToken;

    const adminPassword = 'AdminStrong123';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await prisma.user.update({
      where: { email: 'admin@example.com' },
      data: {
        passwordHash: adminHash,
        passwordSaltRounds: 10,
      },
    });

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: adminPassword })
      .expect(200);

    adminToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await runSeed(prisma, { silent: true });

    if (app) {
      await app.close();
    }

    await prisma.$disconnect();
  });

  describe('GET /services', () => {
    it('returns the catalog with active offerings and professionals', async () => {
      const response = await request(app.getHttpServer())
        .get('/services')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      const services = assertServiceList(response.body);

      expect(Array.isArray(services)).toBe(true);
      expect(services.length).toBeGreaterThan(0);

      const deepCleaning = services.find((service) => service.name === 'Limpieza profunda');
      if (!deepCleaning) {
        throw new Error('No se encontró el servicio de Limpieza profunda en la respuesta.');
      }

      expect(deepCleaning.category).toEqual(
        expect.objectContaining({
          name: 'Limpieza del hogar',
        }),
      );
      expect(deepCleaning.offerings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            professional: expect.objectContaining({
              email: 'carlos.pro@example.com',
            }),
          }),
        ]),
      );
    });
  });

  describe('POST /bookings', () => {
    it('creates a booking using existing catalog entries', async () => {
      const customer = await prisma.customer.findFirst({
        where: { user: { email: 'bruno.cliente@example.com' } },
      });
      const professional = await prisma.professional.findFirst({
        where: { user: { email: 'esteban.pro@example.com' } },
      });
      const service = await prisma.service.findFirst({
        where: { name: 'Mantenimiento eléctrico' },
      });

      if (!customer || !professional || !service) {
        throw new Error('Los datos sembrados requeridos no están disponibles.');
      }

      const scheduledAt = new Date().toISOString();
      const payload = {
        customerId: customer.id,
        professionalId: professional.id,
        serviceId: service.id,
        scheduledAt,
        notes: 'Revisión integral del tablero eléctrico',
      };

      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(payload)
        .expect(201);
      const booking = assertBookingResponse(response.body);

      expect(booking).toMatchObject({
        id: expect.any(Number),
        status: 'PENDING',
        service: expect.objectContaining({
          id: service.id,
          name: 'Mantenimiento eléctrico',
        }),
      });
      expect(new Date(booking.scheduledAt).toISOString()).toBe(scheduledAt);

      const stored = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(stored).not.toBeNull();
      expect(stored?.notes).toBe('Revisión integral del tablero eléctrico');
    });
  });

  describe('POST /payments', () => {
    it('registers a payment for a booking', async () => {
      const customer = await prisma.customer.findFirst({
        where: { user: { email: 'ana.cliente@example.com' } },
      });
      const professional = await prisma.professional.findFirst({
        where: { user: { email: 'carlos.pro@example.com' } },
      });
      const service = await prisma.service.findFirst({
        where: { name: 'Limpieza express' },
      });

      if (!customer || !professional || !service) {
        throw new Error('Los datos sembrados requeridos no están disponibles.');
      }

      const bookingPayload = {
        customerId: customer.id,
        professionalId: professional.id,
        serviceId: service.id,
        scheduledAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        notes: 'Reserva para prueba de pago',
      };

      const bookingResponse = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(bookingPayload)
        .expect(201);
      const createdBooking = assertBookingResponse(bookingResponse.body);

      const paymentPayload = {
        bookingId: createdBooking.id,
        amount: 780.5,
        currency: 'mxn',
        status: PaymentStatus.SUCCEEDED,
        provider: 'stripe',
        providerPaymentId: 'pi_test_integration',
        clientSecret: 'cs_test_integration',
      };

      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(paymentPayload)
        .expect(201);
      const payment = assertPaymentResponse(response.body);

      expect(payment).toMatchObject({
        id: expect.any(Number),
        bookingId: paymentPayload.bookingId,
        amount: 780.5,
        currency: 'MXN',
        status: PaymentStatus.SUCCEEDED,
        provider: 'STRIPE',
        providerPaymentId: 'PI_TEST_INTEGRATION',
      });

      const stored = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(stored).not.toBeNull();
      expect(stored?.bookingId).toBe(paymentPayload.bookingId);
      expect(stored?.amount.toNumber()).toBeCloseTo(780.5);
      expect(stored?.provider).toBe('STRIPE');
      expect(stored?.providerPaymentId).toBe('PI_TEST_INTEGRATION');
    });
  });
});

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
