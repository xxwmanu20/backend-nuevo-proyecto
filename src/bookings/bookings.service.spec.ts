import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BookingStatus, Prisma } from '@prisma/client';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('BookingsService', () => {
  let service: BookingsService;
  const createMock = jest.fn();
  const findManyMock = jest.fn();
  const findUniqueMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: {
            booking: {
              create: createMock,
              findMany: findManyMock,
              findUnique: findUniqueMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delegates booking creation to Prisma, applies defaults, and maps the response', async () => {
    const input: CreateBookingDto = {
      customerId: 1,
      serviceId: 3,
      scheduledAt: '2025-01-05T10:00:00.000Z',
    };
    const stored = {
      id: 42,
      status: BookingStatus.PENDING,
      scheduledAt: new Date(input.scheduledAt),
      service: {
        id: 3,
        name: 'Consultoría',
        description: null,
      },
    } as const;

    createMock.mockResolvedValue(stored);

    const result = await service.create(input);

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        customerId: 1,
        professionalId: undefined,
        serviceId: 3,
        scheduledAt: input.scheduledAt,
        notes: null,
      },
      include: { service: true },
    });

    expect(result).toEqual({
      id: 42,
      status: BookingStatus.PENDING,
      scheduledAt: stored.scheduledAt,
      service: {
        id: 3,
        name: 'Consultoría',
        description: undefined,
      },
    });
  });

  it('throws NotFoundException when detail lookup misses', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(service.detail(99)).rejects.toBeInstanceOf(NotFoundException);
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 99 },
      include: { service: true },
    });
  });

  it('returns booking detail when record exists and normalizes nullable fields', async () => {
    const scheduledAt = new Date('2025-03-03T09:30:00.000Z');
    findUniqueMock.mockResolvedValue({
      id: 101,
      status: BookingStatus.COMPLETED,
      scheduledAt,
      service: {
        id: 9,
        name: 'Visita técnica',
        description: null,
      },
    });

    const detail = await service.detail(101);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { id: 101 },
      include: { service: true },
    });
    expect(detail).toEqual({
      id: 101,
      status: BookingStatus.COMPLETED,
      scheduledAt,
      service: {
        id: 9,
        name: 'Visita técnica',
        description: undefined,
      },
    });
  });

  it('applies pagination arguments on list() and maps bookings', async () => {
    const pagination: PaginationDto = { offset: 40, limit: 10 };
    const scheduled = new Date('2025-02-02T12:00:00.000Z');
    findManyMock.mockResolvedValue([
      {
        id: 10,
        status: BookingStatus.CONFIRMED,
        scheduledAt: scheduled,
        service: {
          id: 7,
          name: 'Sesión premium',
          description: 'Detalle',
        },
      },
    ]);

    const result = await service.list(pagination);

    expect(findManyMock).toHaveBeenCalledWith({
      skip: 40,
      take: 10,
      include: { service: true },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });
    expect(result).toEqual([
      {
        id: 10,
        status: BookingStatus.CONFIRMED,
        scheduledAt: scheduled,
        service: {
          id: 7,
          name: 'Sesión premium',
          description: 'Detalle',
        },
      },
    ]);
  });

  it('uses default pagination values when none are supplied', async () => {
    findManyMock.mockResolvedValue([]);

    const result = await service.list({} as PaginationDto);

    expect(findManyMock).toHaveBeenCalledWith({
      skip: 0,
      take: 25,
      include: { service: true },
      orderBy: { createdAt: Prisma.SortOrder.desc },
    });
    expect(result).toEqual([]);
  });
});
