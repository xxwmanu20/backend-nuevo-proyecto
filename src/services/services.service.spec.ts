import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, ServiceOffering } from '@prisma/client';
import { ServicesService } from './services.service';
import { PrismaService } from '../prisma/prisma.service';
import { ServiceListItem } from './dto/service.response';

// Helper to construct Prisma decimals in a concise way inside fixtures.
const decimal = (value: string): Prisma.Decimal => new Prisma.Decimal(value);

type ServiceOfferingFixture = ServiceOffering & {
  professional: {
    id: number;
    userId: number;
    bio: string | null;
    hourlyRate: Prisma.Decimal | null;
    rating: Prisma.Decimal | null;
    user: {
      id: number;
      email: string;
      passwordHash: string;
      role: string;
      createdAt: Date;
      updatedAt: Date;
    };
  };
};

function assertServiceList(value: unknown): asserts value is ServiceListItem[] {
  if (!Array.isArray(value)) {
    throw new Error('Se esperaba una lista de servicios.');
  }

  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`Elemento inválido en la posición ${index}.`);
    }

    const candidate = item as Record<string, unknown>;

    if (typeof candidate.id !== 'number' || typeof candidate.name !== 'string') {
      throw new Error(`El servicio en la posición ${index} carece de id o nombre.`);
    }

    if (typeof candidate.basePrice !== 'number') {
      throw new Error(`El servicio en la posición ${index} carece de basePrice numérico.`);
    }

    if (!Array.isArray(candidate.offerings)) {
      throw new Error(`El servicio en la posición ${index} debe incluir un arreglo offerings.`);
    }
  });
}

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
    const offerings: ServiceOfferingFixture[] = [
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

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- la respuesta proviene del servicio bajo prueba con datos controlados. */
    const result = await service.list();
    assertServiceList(result);

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
    });

    expect(mapped.offerings).toHaveLength(2);

    const [firstOffering, secondOffering] = mapped.offerings;
    expect(firstOffering).toMatchObject({
      id: 1,
      price: 500,
    });
    expect(firstOffering.professional).toMatchObject({
      email: 'carlos@example.com',
      hourlyRate: 350,
      rating: 4.8,
    });

    expect(secondOffering).toMatchObject({
      id: 2,
      price: 650,
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
    assertServiceList(result);

    expect(result).toHaveLength(2);

    const noOfferings = result[0]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const withNullMetrics = result[1]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment

    if (!noOfferings || !withNullMetrics) {
      throw new Error('Se esperaban dos servicios en la respuesta.');
    }
    expect(noOfferings.offerings).toHaveLength(0);
    expect(noOfferings.description).toBeUndefined();
    expect(noOfferings.category).toMatchObject({ id: 4, name: 'Categoría vacía' });
    const offering = withNullMetrics.offerings[0];
    if (!offering) {
      throw new Error('Se esperaba al menos una oferta para el servicio con métricas nulas.');
    }
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
