import { PrismaClient } from '@prisma/client';

async function run(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const categories = await prisma.serviceCategory.findMany({
      include: { services: true }
    });

    const bookings = await prisma.booking.findMany({
      include: {
        customer: { include: { user: true } },
        professional: { include: { user: true } },
        service: true,
        payments: true
      }
    });

    const payments = await prisma.payment.findMany({
      include: { booking: true }
    });

    const payload = {
      categories,
      bookings,
      payments
    };

    console.log(JSON.stringify(payload, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

run().catch(error => {
  console.error('Error consultando datos sembrados', error);
  process.exit(1);
});
