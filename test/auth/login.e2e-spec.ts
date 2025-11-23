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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
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

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body.user).toEqual({
      id: expect.any(Number),
      email: 'e2e.login@example.com',
      role: 'CUSTOMER',
    });

    const decoded = jwt.verify(response.body.accessToken, keyPair.publicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;

    expect(decoded.email).toBe('e2e.login@example.com');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.userId).toBe(response.body.user.id);
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
