import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, ServiceOffering } from '@prisma/client';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';

// Helper to construct Prisma decimals in a concise way inside fixtures.
const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

describe('ServicesService', () => {
  let service: ServicesService;
  const findManyMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: PrismaService,
          useValue: {
            service: {
              findMany: findManyMock,
            },
          },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('maps services with offerings sorted by price and converts decimals to numbers', async () => {
    const offerings: Array<ServiceOffering & { professional: any }> = [
      {
        id: 1,
        professionalId: 11,
        serviceId: 5,
        price: decimal('500.00'),
        isActive: true,
        professional: {
          id: 11,
          userId: 21,
          bio: 'Offering A',
          hourlyRate: decimal('350.00'),
          rating: decimal('4.8'),
          user: {
            id: 21,
            email: 'carlos@example.com',
            passwordHash: 'hash',
            role: 'PROFESSIONAL',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
      {
        id: 2,
        professionalId: 10,
        serviceId: 5,
        price: decimal('650.00'),
        isActive: true,
        professional: {
          id: 10,
          userId: 20,
          bio: 'Offering B',
          hourlyRate: decimal('420.00'),
          rating: decimal('4.6'),
          user: {
            id: 20,
            email: 'daniela@example.com',
            passwordHash: 'hash',
            role: 'PROFESSIONAL',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      },
    ];

    findManyMock.mockResolvedValue([
      {
        id: 5,
        name: 'Servicio X',
        description: 'Descripción',
        basePrice: decimal('900.00'),
        categoryId: 2,
        category: {
          id: 2,
          name: 'Categoría',
          description: null,
        },
        offerings,
      },
    ]);

    const result = await service.list();

    expect(findManyMock).toHaveBeenCalledTimes(1);
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          category: true,
          offerings: {
            where: { isActive: true },
            orderBy: { price: Prisma.SortOrder.asc },
            include: {
              professional: {
                include: { user: true },
              },
            },
          },
        },
        orderBy: { name: Prisma.SortOrder.asc },
      }),
    );
    expect(result).toHaveLength(1);

    const [mapped] = result;
    expect(mapped).toMatchObject({
      id: 5,
      name: 'Servicio X',
      description: 'Descripción',
      basePrice: 900,
      category: {
        id: 2,
        name: 'Categoría',
      },
      offerings: [
        expect.objectContaining({
          id: 1,
          price: 500,
          professional: expect.objectContaining({
            email: 'carlos@example.com',
            hourlyRate: 350,
            rating: 4.8,
          }),
        }),
        expect.objectContaining({
          id: 2,
          price: 650,
        }),
      ],
    });
  });

  it('handles services without offerings and professionals lacking optional metrics', async () => {
    findManyMock.mockResolvedValue([
      {
        id: 7,
        name: 'Servicio sin ofertas',
        description: null,
        basePrice: decimal('250.00'),
        categoryId: 4,
        category: {
          id: 4,
          name: 'Categoría vacía',
          description: null,
        },
        offerings: [],
      },
      {
        id: 8,
        name: 'Servicio con métricas nulas',
        description: 'Descripción',
        basePrice: decimal('300.00'),
        categoryId: 5,
        category: {
          id: 5,
          name: 'Categoría parcial',
          description: null,
        },
        offerings: [
          {
            id: 3,
            professionalId: 12,
            serviceId: 8,
            price: decimal('300.00'),
            isActive: true,
            professional: {
              id: 12,
              userId: 22,
              bio: null,
              hourlyRate: null,
              rating: null,
              user: {
                id: 22,
                email: 'nulls@example.com',
                passwordHash: 'hash',
                role: 'PROFESSIONAL',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
          },
        ],
      },
    ]);

    const result = await service.list();

    expect(result).toHaveLength(2);

    const [noOfferings, withNullMetrics] = result;
    expect(noOfferings.offerings).toHaveLength(0);
    expect(noOfferings.description).toBeUndefined();
    expect(noOfferings.category).toMatchObject({ id: 4, name: 'Categoría vacía' });

    const [offering] = withNullMetrics.offerings;
    expect(withNullMetrics).toMatchObject({
      id: 8,
      name: 'Servicio con métricas nulas',
      description: 'Descripción',
      basePrice: 300,
      category: { id: 5, name: 'Categoría parcial' },
    });
    expect(offering).toMatchObject({ id: 3, price: 300, isActive: true });
    expect(offering.professional.email).toBe('nulls@example.com');
    expect(offering.professional).toMatchObject({
      bio: undefined,
      hourlyRate: undefined,
      rating: undefined,
    });
  });
});