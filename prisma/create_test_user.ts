import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

(async function main() {
  const prisma = new PrismaClient();
  try {
    const password = 'Test1234';
    const hashed = await bcrypt.hash(password, 10);

    // Upsert user to avoid creating duplicates
    const user = await prisma.user.upsert({
      where: { email: 'prueba@example.com' },
      update: {
        passwordHash: hashed,
        passwordSaltRounds: 10,
        role: UserRole.CUSTOMER,
      },
      create: {
        email: 'prueba@example.com',
        passwordHash: hashed,
        passwordSaltRounds: 10,
        role: UserRole.CUSTOMER,
        customerProfile: {
          create: { phone: '+521555000000' },
        },
      },
      include: { customerProfile: true },
    });

    console.log('User upserted:', { id: user.id, email: user.email });
  } catch (err) {
    console.error('Error creating/updating user:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
