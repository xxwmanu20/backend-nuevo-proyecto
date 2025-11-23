import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { UserRole } from '@prisma/client';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtKeyService } from '../../src/auth/jwt-key.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type AuthResponseJson = {
  accessToken: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
};

const assertAuthResponse = (value: unknown): AuthResponseJson => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('La respuesta debe ser un objeto con credenciales.');
  }

  const { accessToken, user } = value as {
    accessToken?: unknown;
    user?: unknown;
  };

  if (typeof accessToken !== 'string') {
    throw new Error('Se esperaba un token de acceso válido.');
  }

  if (typeof user !== 'object' || user === null || Array.isArray(user)) {
    throw new Error('Se esperaba un objeto usuario.');
  }

  const { id, email, role } = user as {
    id?: unknown;
    email?: unknown;
    role?: unknown;
  };

  if (typeof id !== 'number' || typeof email !== 'string' || typeof role !== 'string') {
    throw new Error('El usuario debe exponer id, email y role.');
  }

  return {
    accessToken,
    user: {
      id,
      email,
      role,
    },
  };
};

describe('AuthController /auth/login (e2e)', () => {
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
      where: { email: 'e2e.login@example.com' },
      update: {
        passwordHash: await bcrypt.hash('ValidPass123', 10),
      },
      create: {
        email: 'e2e.login@example.com',
        passwordHash: await bcrypt.hash('ValidPass123', 10),
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
    await prisma.user.delete({ where: { email: 'e2e.login@example.com' } });
    await prisma.$disconnect();
    await app.close();
  });

  it('returns a token and user details for valid credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e.login@example.com', password: 'ValidPass123' })
      .expect(200);

    const authPayload = assertAuthResponse(response.body as unknown); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { accessToken, user } = authPayload;

    expect(typeof user.id).toBe('number');
    expect(user.email).toBe('e2e.login@example.com');
    expect(user.role).toBe('CUSTOMER');

    const decoded = jwt.verify(accessToken, keyPair.publicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;

    expect(decoded.email).toBe('e2e.login@example.com');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.userId).toBe(user.id);
  });

  it('rejects invalid credentials', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'e2e.login@example.com', password: 'WrongPass999' })
      .expect(401);
  });

  it('rejects non-existing users', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'no-user@example.com', password: 'Whatever123' })
      .expect(401);
  });
});
