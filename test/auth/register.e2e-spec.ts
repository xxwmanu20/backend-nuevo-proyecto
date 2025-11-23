import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { AuthController } from '../../src/auth/auth.controller';
import { AuthService } from '../../src/auth/auth.service';
import { JwtKeyService } from '../../src/auth/jwt-key.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type UserRecord = {
  id: number;
  email: string;
  passwordHash: string;
  passwordSaltRounds: number;
  role: string;
};

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
    throw new Error('La respuesta de autenticación debe ser un objeto.');
  }

  const { accessToken, user } = value as {
    accessToken?: unknown;
    user?: unknown;
  };

  if (typeof accessToken !== 'string') {
    throw new Error('La respuesta de autenticación debe incluir un token.');
  }

  if (typeof user !== 'object' || user === null || Array.isArray(user)) {
    throw new Error('La respuesta de autenticación debe incluir un usuario.');
  }

  const { id, email, role } = user as {
    id?: unknown;
    email?: unknown;
    role?: unknown;
  };

  if (typeof id !== 'number' || typeof email !== 'string' || typeof role !== 'string') {
    throw new Error('El usuario debe exponer id, email y role válidos.');
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

jest.mock('bcrypt', () => ({
  hash: jest.fn((plain: string, rounds: number) =>
    Promise.resolve(`bcrypt-mock|${rounds}|${plain}`),
  ),
  compare: jest.fn((plain: string, hash: string) => {
    const parts = hash.split('|');
    return Promise.resolve(parts.length === 3 && parts[2] === plain);
  }),
}));

class PrismaServiceMock {
  private users: UserRecord[] = [];
  private nextId = 1;

  user = {
    findUnique: jest.fn(
      ({ where, select }: { where: { email?: string }; select?: Record<string, boolean> }) => {
        const user = this.users.find((item) => (where.email ? item.email === where.email : false));

        if (!user) {
          return null;
        }

        return select ? PrismaServiceMock.applySelect(user, select) : { ...user };
      },
    ),
    create: jest.fn(
      ({ data, select }: { data: Omit<UserRecord, 'id'>; select?: Record<string, boolean> }) => {
        const newUser: UserRecord = {
          id: this.nextId++,
          ...data,
        };

        this.users.push(newUser);

        return select ? PrismaServiceMock.applySelect(newUser, select) : { ...newUser };
      },
    ),
  };

  reset(): void {
    this.users = [];
    this.nextId = 1;
    this.user.findUnique.mockReset();
    this.user.create.mockReset();
  }

  getAllUsers(): UserRecord[] {
    return this.users;
  }

  private static applySelect(
    entity: UserRecord,
    select: Record<string, boolean>,
  ): Partial<UserRecord> {
    return Object.entries(select).reduce<Partial<UserRecord>>((acc, [key, include]) => {
      if (include) {
        const typedKey = key as keyof UserRecord;
        (acc as Record<keyof UserRecord, UserRecord[keyof UserRecord]>)[typedKey] =
          entity[typedKey];
      }

      return acc;
    }, {} as Partial<UserRecord>);
  }
}

describe('AuthController /auth/register (e2e)', () => {
  let app: INestApplication;
  let prismaMock: PrismaServiceMock;
  let moduleRef: TestingModule;
  let privateKey: string;
  let publicKey: string;
  const jwtKeyServiceMock = {
    getPrivateKey: jest.fn(),
    getPublicKey: jest.fn(),
  } satisfies Pick<JwtKeyService, 'getPrivateKey' | 'getPublicKey'>;

  beforeAll(() => {
    const pair = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
  });

  beforeEach(async () => {
    prismaMock = new PrismaServiceMock();
    jwtKeyServiceMock.getPrivateKey.mockReset();
    jwtKeyServiceMock.getPublicKey.mockReset();
    jwtKeyServiceMock.getPrivateKey.mockReturnValue(privateKey);
    jwtKeyServiceMock.getPublicKey.mockReturnValue(publicKey);

    moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue?: unknown) => {
              if (key === 'app.bcrypt.saltRounds') {
                return 12;
              }

              if (key === 'app.jwt.expiresIn') {
                return '1h';
              }

              return defaultValue;
            },
          },
        },
        {
          provide: JwtKeyService,
          useValue: jwtKeyServiceMock,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    prismaMock.reset();
  });

  it('registers a user and allows subsequent login', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@example.com', password: 'strong-pass' })
      .expect(201);

    const registerPayload = assertAuthResponse(registerResponse.body as unknown);

    expect(registerPayload.user).toEqual({
      id: 1,
      email: 'user@example.com',
      role: 'CUSTOMER',
    });
    expect(jwtKeyServiceMock.getPrivateKey).toHaveBeenCalledTimes(1);

    const storedUsers = prismaMock.getAllUsers();
    expect(storedUsers).toHaveLength(1);
    expect(storedUsers[0]).toMatchObject({
      email: 'user@example.com',
      passwordHash: 'bcrypt-mock|12|strong-pass',
      passwordSaltRounds: 12,
      role: 'CUSTOMER',
    });

    const decoded = jwt.verify(registerPayload.accessToken, publicKey, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.userId).toBe(1);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'strong-pass' })
      .expect(200)
      .expect(({ body }) => {
        const authPayload = assertAuthResponse(body as unknown);
        expect(authPayload.user).toEqual({ id: 1, email: 'user@example.com', role: 'CUSTOMER' });
      });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-pass' })
      .expect(401);
  });

  it('rejects duplicate registrations', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'strong-pass' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'another-pass' })
      .expect(409);

    expect(prismaMock.getAllUsers()).toHaveLength(1);
  });
});
