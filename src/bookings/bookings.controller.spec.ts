import { Test } from '@nestjs/testing';
import { INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { BookingStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

const bookingResponse = {
  id: 1,
  status: BookingStatus.PENDING,
  scheduledAt: new Date('2025-01-01T10:00:00.000Z'),
  service: { id: 2, name: 'Test Service', description: 'Desc' },
} as const;

describe('BookingsController', () => {
  let app: INestApplication;
  const createMock = jest.fn();
  const listMock = jest.fn();
  const detailMock = jest.fn();

  const basePayload = {
    customerId: 1,
    serviceId: 2,
    scheduledAt: '2025-01-01T10:00:00.000Z',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        {
          provide: BookingsService,
          useValue: {
            create: createMock,
            list: listMock,
            detail: detailMock,
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

  it('returns 201 and delegates creation to BookingsService', async () => {
    createMock.mockResolvedValue(bookingResponse);

    await request(app.getHttpServer())
      .post('/bookings')
      .send(basePayload)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "id": 1,
  "scheduledAt": "2025-01-01T10:00:00.000Z",
  "service": {
    "description": "Desc",
    "id": 2,
    "name": "Test Service",
  },
  "status": "PENDING",
}
`);
      });

    expect(createMock).toHaveBeenCalledWith(basePayload);
  });

  it('returns 400 when required fields are missing in create payload', async () => {
    await request(app.getHttpServer())
      .post('/bookings')
      .send({ customerId: 1 })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "error": "Bad Request",
  "message": [
    "serviceId must not be less than 1",
    "serviceId must be an integer number",
    "scheduledAt must be a valid ISO 8601 date string",
  ],
  "statusCode": 400,
}
`);
      });

    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns bookings list with query pagination', async () => {
    listMock.mockResolvedValue([bookingResponse]);

    await request(app.getHttpServer())
      .get('/bookings')
      .query({ offset: '5', limit: '10' })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
[
  {
    "id": 1,
    "scheduledAt": "2025-01-01T10:00:00.000Z",
    "service": {
      "description": "Desc",
      "id": 2,
      "name": "Test Service",
    },
    "status": "PENDING",
  },
]
`);
      });

    expect(listMock).toHaveBeenCalledWith({ offset: 5, limit: 10 });
  });

  it('returns 400 when pagination query params are invalid', async () => {
    await request(app.getHttpServer())
      .get('/bookings')
      .query({ offset: '-1', limit: '0' })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "error": "Bad Request",
  "message": [
    "offset must not be less than 0",
    "limit must not be less than 1",
  ],
  "statusCode": 400,
}
`);
      });

    expect(listMock).not.toHaveBeenCalled();
  });

  it('returns detail payload when service resolves', async () => {
    detailMock.mockResolvedValue(bookingResponse);

    await request(app.getHttpServer())
      .get('/bookings/3')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchInlineSnapshot(`
{
  "id": 1,
  "scheduledAt": "2025-01-01T10:00:00.000Z",
  "service": {
    "description": "Desc",
    "id": 2,
    "name": "Test Service",
  },
  "status": "PENDING",
}
`);
      });

    expect(detailMock).toHaveBeenCalledWith(3);
  });

  it('propagates NotFoundException from detail', async () => {
    detailMock.mockRejectedValue(new NotFoundException('Booking not found'));

    await request(app.getHttpServer())
      .get('/bookings/99')
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

  it('returns 400 for non-numeric booking id', async () => {
    await request(app.getHttpServer())
      .get('/bookings/abc')
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe('Validation failed (numeric string is expected)');
      });

    expect(detailMock).not.toHaveBeenCalled();
  });
});
