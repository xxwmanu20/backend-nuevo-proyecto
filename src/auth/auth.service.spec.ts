import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { JwtKeyService } from './jwt-key.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

jest.mock('bcrypt', () => ({
  hash: jest.fn((plain: string, rounds: number) =>
    Promise.resolve(`bcrypt-mock|${rounds}|${plain}`),
  ),
  compare: jest.fn((plain: string, hash: string) => {
    const parts = hash.split('|');
    return Promise.resolve(parts.length === 3 && parts[2] === plain);
  }),
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClientMock {},
  UserRole: {
    CUSTOMER: 'CUSTOMER',
    PROFESSIONAL: 'PROFESSIONAL',
    ADMIN: 'ADMIN',
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  const findUniqueMock = jest.fn();
  const createMock = jest.fn();
  const updateMock = jest.fn();
  const configGetMock = jest.fn();
  const jwtKeyServiceMock = {
    getPrivateKey: jest.fn(),
    getPublicKey: jest.fn(),
  } satisfies Pick<JwtKeyService, 'getPrivateKey' | 'getPublicKey'>;
  let privateKeyPem = '';
  let publicKeyPem = '';
  let configValues: Map<string, unknown>;

  beforeAll(() => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    privateKeyPem = privateKey;
    publicKeyPem = publicKey;
  });

  beforeEach(async () => {
    configValues = new Map<string, unknown>([
      ['app.bcrypt.saltRounds', 4],
      ['app.jwt.expiresIn', '5m'],
      ['app.jwt.refreshExpiresIn', '7d'],
      ['app.jwt.passwordResetExpiresIn', '30m'],
    ]);

    configGetMock.mockImplementation((key: string, defaultValue?: unknown) => {
      return configValues.has(key) ? configValues.get(key) : defaultValue;
    });

    jwtKeyServiceMock.getPrivateKey.mockReset();
    jwtKeyServiceMock.getPublicKey.mockReset();
    jwtKeyServiceMock.getPrivateKey.mockReturnValue(privateKeyPem);
    jwtKeyServiceMock.getPublicKey.mockReturnValue(publicKeyPem);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: findUniqueMock,
              create: createMock,
              update: updateMock,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: configGetMock,
          },
        },
        {
          provide: JwtKeyService,
          useValue: jwtKeyServiceMock,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('uses numeric expiresIn when configuration provides number-like strings', async () => {
    const passwordHash = await service.hashPassword('secret');
    configValues.set('app.jwt.expiresIn', '1800');
    const signSpy = jest.spyOn(jwt, 'sign');

    findUniqueMock.mockResolvedValue({
      id: 9,
      email: 'timer@example.com',
      role: 'CUSTOMER',
      passwordSaltRounds: 4,
      passwordHash,
    });

    await service.login('timer@example.com', 'secret');

    expect(signSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sub: '9' }),
      expect.any(String),
      expect.objectContaining({ expiresIn: 1800 }),
    );

    signSpy.mockRestore();
  });

  it('falls back to default expiresIn when configuration is empty', async () => {
    const passwordHash = await service.hashPassword('secret');
    configValues.set('app.jwt.expiresIn', '');
    const signSpy = jest.spyOn(jwt, 'sign');

    findUniqueMock.mockResolvedValue({
      id: 10,
      email: 'fallback@example.com',
      role: 'CUSTOMER',
      passwordSaltRounds: 4,
      passwordHash,
    });

    await service.login('fallback@example.com', 'secret');

    expect(signSpy).toHaveBeenCalledWith(
      expect.objectContaining({ sub: '10' }),
      expect.any(String),
      expect.objectContaining({ expiresIn: '15m' }),
    );

    signSpy.mockRestore();
  });

  it('returns a token when credentials are valid', async () => {
    const passwordHash = await service.hashPassword('secret');
    findUniqueMock.mockResolvedValue({
      id: 5,
      email: 'user@example.com',
      role: 'CUSTOMER',
      passwordSaltRounds: 4,
      passwordHash,
    });
    const result = await service.login('user@example.com', 'secret');

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'user@example.com' },
      select: {
        email: true,
        id: true,
        passwordSaltRounds: true,
        passwordHash: true,
        role: true,
      },
    });

    const decoded = jwt.verify(result.accessToken, publicKeyPem, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;
    expect(decoded.sub).toBe('5');
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.role).toBe('CUSTOMER');
    expect(decoded.userId).toBe(5);
    expect(decoded.tokenType).toBe('access');

    const refreshPayload = jwt.verify(result.refreshToken, publicKeyPem, {
      algorithms: ['RS256'],
    }) as jwt.JwtPayload;
    expect(refreshPayload.tokenType).toBe('refresh');
    expect(refreshPayload.sub).toBe('5');

    expect(result.user).toEqual({ id: 5, email: 'user@example.com', role: 'CUSTOMER' });
    expect(typeof result.refreshToken).toBe('string');
    expect(jwtKeyServiceMock.getPrivateKey).toHaveBeenCalledTimes(2);
  });

  it('throws when user is not found', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(service.login('missing@example.com', 'secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'missing@example.com' },
      select: {
        email: true,
        id: true,
        passwordHash: true,
        passwordSaltRounds: true,
        role: true,
      },
    });
  });

  it('throws when password does not match stored hash', async () => {
    const passwordHash = await service.hashPassword('another-secret');
    findUniqueMock.mockResolvedValue({
      id: 7,
      email: 'user@example.com',
      role: 'CUSTOMER',
      passwordHash,
      passwordSaltRounds: 4,
    });

    await expect(service.login('user@example.com', 'secret')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('hashes passwords with configured salt rounds', async () => {
    configValues.set('app.bcrypt.saltRounds', 6);
    configGetMock.mockReset();
    configGetMock.mockImplementation((key: string, defaultValue?: unknown) => {
      return configValues.has(key) ? configValues.get(key) : defaultValue;
    });

    const hash = await service.hashPassword('plain-text');

    expect(configGetMock).toHaveBeenCalledWith('app.bcrypt.saltRounds', 10);
    expect(await bcrypt.compare('plain-text', hash)).toBe(true);
  });

  it('registers new users with hashed password and salt rounds', async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    createMock.mockResolvedValue({
      id: 12,
      email: 'new@example.com',
      role: UserRole.CUSTOMER,
    });

    const result = await service.register('new@example.com', 'strong-password');

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'new@example.com' },
      select: {
        id: true,
      },
    });
    expect(createMock).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        passwordHash: 'bcrypt-mock|4|strong-password',
        passwordSaltRounds: 4,
        role: UserRole.CUSTOMER,
      },
      select: {
        email: true,
        id: true,
        role: true,
      },
    });
    expect(result.user).toEqual({ id: 12, email: 'new@example.com', role: UserRole.CUSTOMER });
    expect(typeof result.refreshToken).toBe('string');
    expect(jwtKeyServiceMock.getPrivateKey).toHaveBeenCalledTimes(2);
  });

  it('throws conflict when email already exists during registration', async () => {
    findUniqueMock.mockResolvedValue({ id: 1 });

    await expect(service.register('dup@example.com', 'strong-password')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('issues new tokens when refresh token is valid', async () => {
    const passwordHash = await service.hashPassword('secret');
    findUniqueMock
      .mockResolvedValueOnce({
        id: 5,
        email: 'user@example.com',
        role: 'CUSTOMER',
        passwordSaltRounds: 4,
        passwordHash,
      })
      .mockResolvedValueOnce({
        id: 5,
        email: 'user@example.com',
        role: 'CUSTOMER',
      });

    const initial = await service.login('user@example.com', 'secret');
    const refreshed = await service.refresh(initial.refreshToken);

    expect(refreshed.user).toEqual({ id: 5, email: 'user@example.com', role: 'CUSTOMER' });
    expect(refreshed.accessToken).not.toBe(initial.accessToken);
    expect(refreshed.refreshToken).not.toBe(initial.refreshToken);
    expect(jwtKeyServiceMock.getPublicKey).toHaveBeenCalled();
  });

  it('rejects refresh attempts with invalid token type', async () => {
    const passwordHash = await service.hashPassword('secret');
    findUniqueMock.mockResolvedValue({
      id: 5,
      email: 'user@example.com',
      role: 'CUSTOMER',
      passwordSaltRounds: 4,
      passwordHash,
    });

    const initial = await service.login('user@example.com', 'secret');

    await expect(service.refresh(initial.accessToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('returns success without token when requesting reset for unknown email', async () => {
    findUniqueMock.mockResolvedValue(null);

    const response = await service.requestPasswordReset('unknown@example.com');

    expect(response).toEqual({ success: true });
    expect(jwtKeyServiceMock.getPrivateKey).not.toHaveBeenCalled();
  });

  it('issues reset token and updates password on reset', async () => {
    findUniqueMock
      .mockResolvedValueOnce({
        id: 3,
        email: 'reset@example.com',
        role: 'CUSTOMER',
      })
      .mockResolvedValueOnce({
        id: 3,
        email: 'reset@example.com',
        role: 'CUSTOMER',
      });

    const request = await service.requestPasswordReset('reset@example.com');
    expect(request.success).toBe(true);
    expect(typeof request.resetToken).toBe('string');

    findUniqueMock.mockResolvedValueOnce({
      id: 3,
      email: 'reset@example.com',
      role: 'CUSTOMER',
    });

    const result = await service.resetPassword(request.resetToken as string, 'NewSecret123');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 3 },
      data: {
        passwordHash: 'bcrypt-mock|4|NewSecret123',
        passwordSaltRounds: 4,
      },
    });
    expect(result.user).toEqual({ id: 3, email: 'reset@example.com', role: 'CUSTOMER' });
    expect(typeof result.refreshToken).toBe('string');
  });
});
