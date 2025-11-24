import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtKeyService } from '../../src/auth/jwt-key.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from '@prisma/client';

const assertSuccessResponse = (value: unknown): { success: true; resetToken?: string } => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('La respuesta debe contener el estatus de la solicitud.');
  }

  const { success, resetToken } = value as {
    success?: unknown;
    resetToken?: unknown;
  };

  if (success !== true) {
    throw new Error('Se esperaba success=true.');
  }

  if (resetToken !== undefined && typeof resetToken !== 'string') {
    throw new Error('resetToken debe ser cadena cuando está presente.');
  }

  return {
    success: true,
    resetToken: resetToken,
  };
};

const assertAuthResponse = (value: unknown) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('La respuesta debe incluir credenciales.');
  }

  const { accessToken, refreshToken, user } = value as {
    accessToken?: unknown;
    refreshToken?: unknown;
    user?: unknown;
  };

  if (typeof accessToken !== 'string' || typeof refreshToken !== 'string') {
    throw new Error('Tokens inválidos.');
  }

  if (typeof user !== 'object' || user === null || Array.isArray(user)) {
    throw new Error('Usuario inválido.');
  }

  const { email } = user as { email?: unknown };

  if (typeof email !== 'string') {
    throw new Error('Usuario debe incluir email.');
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
};

describe('AuthController password reset flows (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const keyPair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    await prisma.user.upsert({
      where: { email: 'password.reset@example.com' },
      update: {
        passwordHash: await bcrypt.hash('OriginalPass123', 10),
      },
      create: {
        email: 'password.reset@example.com',
        passwordHash: await bcrypt.hash('OriginalPass123', 10),
        role: UserRole.CUSTOMER,
      },
    });

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              if (key === 'app.jwt.expiresIn') {
                return '5m';
              }

              if (key === 'app.jwt.refreshExpiresIn') {
                return '7d';
              }

              if (key === 'app.jwt.passwordResetExpiresIn') {
                return '30m';
              }

              if (key === 'app.bcrypt.saltRounds') {
                return 10;
              }

              return defaultValue;
            },
          },
        },
        {
          provide: JwtKeyService,
          useValue: {
            getPrivateKey: () => keyPair.privateKey,
            getPublicKey: () => keyPair.publicKey,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.update({
      where: { email: 'password.reset@example.com' },
      data: {
        passwordHash: await bcrypt.hash('OriginalPass123', 10),
      },
    });
    await prisma.$disconnect();
    await app.close();
  });

  it('returns success for unknown email without issuing token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email: 'unknown@example.com' })
      .expect(201);

    const payload = assertSuccessResponse(response.body as unknown);
    expect(payload.resetToken).toBeUndefined();
  });

  it('allows resetting the password using the provided token', async () => {
    const requestResponse = await request(app.getHttpServer())
      .post('/auth/password/forgot')
      .send({ email: 'password.reset@example.com' })
      .expect(201);

    const { resetToken } = assertSuccessResponse(requestResponse.body as unknown);
    expect(typeof resetToken).toBe('string');

    const resetResponse = await request(app.getHttpServer())
      .post('/auth/password/reset')
      .send({ token: resetToken, password: 'BrandNewPass456' })
      .expect(201);

    const authPayload = assertAuthResponse(resetResponse.body as unknown);
    expect(authPayload.user).toEqual(
      expect.objectContaining({ email: 'password.reset@example.com', role: 'CUSTOMER' }),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'password.reset@example.com', password: 'BrandNewPass456' })
      .expect(200);
  });
});
