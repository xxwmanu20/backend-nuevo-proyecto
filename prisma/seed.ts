import { Prisma, PrismaClient } from '@prisma/client';
import { BookingStatus, PaymentStatus, UserRole } from '../src/common/enums';

const ensureDatabaseUrl = (): string => {
  const fallbackUrl = 'file:./dev.db';
  const url = process.env.DATABASE_URL ?? fallbackUrl;
  process.env.DATABASE_URL = url;
  return url;
};

const daysFromNow = (days: number): Date => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

type SeedOptions = {
  silent?: boolean;
};

const logMessage = (silent: boolean, message: string): void => {
  if (!silent) {
    console.log(message);
  }
};

export async function runSeed(prismaClient?: PrismaClient, options: SeedOptions = {}): Promise<void> {
  const { silent = false } = options;
  const databaseUrl = ensureDatabaseUrl();
  const client = prismaClient ?? new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const shouldDisconnect = !prismaClient;

  try {
    logMessage(silent, '🌱 Iniciando seeding de datos de ejemplo...');

    // Limpieza básica para evitar duplicados en sucesivas ejecuciones.
    await client.$transaction([
      client.payment.deleteMany(),
      client.booking.deleteMany(),
      client.serviceOffering.deleteMany(),
      client.service.deleteMany(),
      client.serviceCategory.deleteMany(),
      client.professional.deleteMany(),
      client.customer.deleteMany(),
      client.user.deleteMany()
    ]);

    const [cleaningCategory, repairsCategory] = await Promise.all([
      client.serviceCategory.create({
        data: {
          name: 'Limpieza del hogar',
          description: 'Servicios de limpieza residencial y mantenimiento',
          services: {
            create: [
              {
                name: 'Limpieza profunda',
                description: 'Incluye limpieza de cocina, baños, ventanas y superficies',
                basePrice: new Prisma.Decimal('850.00')
              },
              {
                name: 'Limpieza express',
                description: 'Servicio de 2 horas para mantenimiento rápido',
                basePrice: new Prisma.Decimal('450.00')
              }
            ]
          }
        },
        include: { services: true }
      }),
      client.serviceCategory.create({
        data: {
          name: 'Reparaciones menores',
          description: 'Plomería, electricidad y mantenimiento general',
          services: {
            create: [
              {
                name: 'Reparación de grifos',
                description: 'Solución de fugas y reemplazo de componentes',
                basePrice: new Prisma.Decimal('600.00')
              },
              {
                name: 'Mantenimiento eléctrico',
                description: 'Inspección de tableros y reemplazo de componentes eléctricos',
                basePrice: new Prisma.Decimal('750.00')
              }
            ]
          }
        },
        include: { services: true }
      })
    ]);

    const serviceByName = new Map<string, number>();
    for (const category of [cleaningCategory, repairsCategory]) {
      for (const service of category.services) {
        serviceByName.set(service.name, service.id);
      }
    }

    const customerUsers = await Promise.all([
      client.user.create({
        data: {
          email: 'ana.cliente@example.com',
          passwordHash: 'hashed-password',
          role: UserRole.CUSTOMER,
          customerProfile: {
            create: {
              phone: '+521555001001'
            }
          }
        },
        include: {
          customerProfile: true
        }
      }),
      client.user.create({
        data: {
          email: 'bruno.cliente@example.com',
          passwordHash: 'hashed-password',
          role: UserRole.CUSTOMER,
          customerProfile: {
            create: {
              phone: '+521555002002'
            }
          }
        },
        include: {
          customerProfile: true
        }
      })
    ]);

    const customerIdByEmail = new Map<string, number>();
    customerUsers.forEach(user => {
      if (!user.customerProfile) {
        throw new Error(`El usuario ${user.email} no se creó como cliente correctamente.`);
      }
      customerIdByEmail.set(user.email, user.customerProfile.id);
    });

    const professionalUsers = await Promise.all([
      client.user.create({
        data: {
          email: 'carlos.pro@example.com',
          passwordHash: 'hashed-password',
          role: UserRole.PROFESSIONAL,
          professionalProfile: {
            create: {
              bio: 'Especialista en limpieza profunda con 5 años de experiencia',
              hourlyRate: new Prisma.Decimal('350.00'),
              rating: new Prisma.Decimal('4.8')
            }
          }
        },
        include: {
          professionalProfile: true
        }
      }),
      client.user.create({
        data: {
          email: 'daniela.pro@example.com',
          passwordHash: 'hashed-password',
          role: UserRole.PROFESSIONAL,
          professionalProfile: {
            create: {
              bio: 'Técnica integral de mantenimiento con especialidad en plomería',
              hourlyRate: new Prisma.Decimal('420.00'),
              rating: new Prisma.Decimal('4.6')
            }
          }
        },
        include: {
          professionalProfile: true
        }
      }),
      client.user.create({
        data: {
          email: 'esteban.pro@example.com',
          passwordHash: 'hashed-password',
          role: UserRole.PROFESSIONAL,
          professionalProfile: {
            create: {
              bio: 'Electricista certificado con experiencia en diagnósticos residenciales',
              hourlyRate: new Prisma.Decimal('400.00'),
              rating: new Prisma.Decimal('4.5')
            }
          }
        },
        include: {
          professionalProfile: true
        }
      })
    ]);

    const professionalIdByEmail = new Map<string, number>();
    professionalUsers.forEach(user => {
      if (!user.professionalProfile) {
        throw new Error(`El usuario ${user.email} no se creó como profesional correctamente.`);
      }
      professionalIdByEmail.set(user.email, user.professionalProfile.id);
    });

    await client.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: 'hashed-password',
        role: UserRole.ADMIN
      }
    });

    await client.serviceOffering.createMany({
      data: [
        {
          professionalId: professionalIdByEmail.get('carlos.pro@example.com')!,
          serviceId: serviceByName.get('Limpieza profunda')!,
          price: new Prisma.Decimal('900.00'),
          isActive: true
        },
        {
          professionalId: professionalIdByEmail.get('carlos.pro@example.com')!,
          serviceId: serviceByName.get('Limpieza express')!,
          price: new Prisma.Decimal('500.00'),
          isActive: true
        },
        {
          professionalId: professionalIdByEmail.get('daniela.pro@example.com')!,
          serviceId: serviceByName.get('Reparación de grifos')!,
          price: new Prisma.Decimal('650.00'),
          isActive: true
        },
        {
          professionalId: professionalIdByEmail.get('daniela.pro@example.com')!,
          serviceId: serviceByName.get('Limpieza express')!,
          price: new Prisma.Decimal('520.00'),
          isActive: true
        },
        {
          professionalId: professionalIdByEmail.get('esteban.pro@example.com')!,
          serviceId: serviceByName.get('Mantenimiento eléctrico')!,
          price: new Prisma.Decimal('820.00'),
          isActive: true
        }
      ]
    });

    const bookingSeeds: Array<{
      customerEmail: string;
      professionalEmail?: string;
      serviceName: string;
      status: BookingStatus;
      daysFromNow: number;
      notes?: string;
      payment?: {
        amount: string;
        currency: string;
        status: PaymentStatus;
        provider: string;
        providerPaymentId?: string;
        clientSecret?: string;
      };
    }> = [
      {
        customerEmail: 'ana.cliente@example.com',
        professionalEmail: 'carlos.pro@example.com',
        serviceName: 'Limpieza profunda',
        status: BookingStatus.CONFIRMED,
        daysFromNow: 1,
        notes: 'Llevar productos ecológicos',
        payment: {
          amount: '900.00',
          currency: 'MXN',
          status: PaymentStatus.SUCCEEDED,
          provider: 'stripe',
          providerPaymentId: 'pi_seed_001',
          clientSecret: 'cs_seed_001'
        }
      },
      {
        customerEmail: 'bruno.cliente@example.com',
        professionalEmail: 'carlos.pro@example.com',
        serviceName: 'Limpieza express',
        status: BookingStatus.PENDING,
        daysFromNow: 3,
        payment: {
          amount: '500.00',
          currency: 'MXN',
          status: PaymentStatus.REQUIRES_CONFIRMATION,
          provider: 'stripe',
          providerPaymentId: 'pi_seed_002',
          clientSecret: 'cs_seed_002'
        }
      },
      {
        customerEmail: 'ana.cliente@example.com',
        professionalEmail: 'daniela.pro@example.com',
        serviceName: 'Reparación de grifos',
        status: BookingStatus.COMPLETED,
        daysFromNow: -5,
        notes: 'Revisar presión de agua',
        payment: {
          amount: '650.00',
          currency: 'MXN',
          status: PaymentStatus.SUCCEEDED,
          provider: 'paypal',
          providerPaymentId: 'pp_seed_003'
        }
      },
      {
        customerEmail: 'bruno.cliente@example.com',
        professionalEmail: 'daniela.pro@example.com',
        serviceName: 'Reparación de grifos',
        status: BookingStatus.CANCELLED,
        daysFromNow: 7,
        notes: 'Cliente solicitó reagendar con mayor anticipación',
        payment: {
          amount: '650.00',
          currency: 'MXN',
          status: PaymentStatus.REFUNDED,
          provider: 'paypal',
          providerPaymentId: 'pp_seed_004'
        }
      },
      {
        customerEmail: 'ana.cliente@example.com',
        serviceName: 'Limpieza express',
        status: BookingStatus.PENDING,
        daysFromNow: 2,
        notes: 'Esperando asignación de profesional',
        payment: {
          amount: '450.00',
          currency: 'MXN',
          status: PaymentStatus.FAILED,
          provider: 'stripe',
          providerPaymentId: 'pi_seed_005'
        }
      }
    ];

    for (const seed of bookingSeeds) {
      const customerId = customerIdByEmail.get(seed.customerEmail);
      if (!customerId) {
        throw new Error(`No se encontró el cliente ${seed.customerEmail} para crear la reserva.`);
      }

      const serviceId = serviceByName.get(seed.serviceName);
      if (!serviceId) {
        throw new Error(`No se encontró el servicio ${seed.serviceName} para crear la reserva.`);
      }

      let professionalId: number | null = null;
      if (seed.professionalEmail) {
        professionalId = professionalIdByEmail.get(seed.professionalEmail) ?? null;
        if (professionalId === null) {
          throw new Error(`No se encontró el profesional ${seed.professionalEmail} para crear la reserva.`);
        }
      }

      const booking = await client.booking.create({
        data: {
          customerId,
          professionalId,
          serviceId,
          scheduledAt: daysFromNow(seed.daysFromNow),
          status: seed.status,
          notes: seed.notes ?? null
        }
      });

      if (seed.payment) {
        await client.payment.create({
          data: {
            bookingId: booking.id,
            amount: new Prisma.Decimal(seed.payment.amount),
            currency: seed.payment.currency.toUpperCase(),
            status: seed.payment.status,
            provider: seed.payment.provider,
            providerPaymentId: seed.payment.providerPaymentId ?? null,
            clientSecret: seed.payment.clientSecret ?? null
          }
        });
      }
    }

    logMessage(silent, '✅ Datos de ejemplo cargados correctamente.');
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

if (require.main === module) {
  runSeed().catch(error => {
    console.error('❌ Error durante el seeding', error);
    process.exit(1);
  });
}
