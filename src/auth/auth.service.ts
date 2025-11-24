import {
  ConflictException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { SignOptions, sign, verify } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { JwtKeyService } from './jwt-key.service';
import { JwtTokenPayload } from './interfaces/jwt-token-payload.interface';
import { AuthResult, AuthenticatedUser } from './interfaces/auth-result.interface';

export { AuthResult, AuthenticatedUser } from './interfaces/auth-result.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly jwtKeyService: JwtKeyService,
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
        passwordSaltRounds: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.validatePassword(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sanitizedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return this.buildAuthResult(sanitizedUser);
  }

  async register(email: string, password: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const saltRounds = this.getSaltRounds();
    const passwordHash = await this.hashPassword(password);

    const created = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        passwordSaltRounds: saltRounds,
        role: UserRole.CUSTOMER,
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return this.buildAuthResult(created);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = this.verifyToken(refreshToken, 'refresh');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return this.buildAuthResult(user);
  }

  async requestPasswordReset(email: string): Promise<{ success: true; resetToken?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return { success: true };
    }

    const resetToken = this.createPasswordResetToken(user);

    return {
      success: true,
      resetToken,
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
    const payload = this.verifyToken(token, 'password-reset');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    const hashedPassword = await this.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedPassword,
        passwordSaltRounds: this.getSaltRounds(),
      },
    });

    return this.buildAuthResult(user);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.getSaltRounds());
  }

  async validatePassword(password: string, hash: string | null | undefined): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return bcrypt.compare(password, hash);
  }

  private getSaltRounds(): number {
    const fallback = 10;
    const configured = this.configService.get<number>('app.bcrypt.saltRounds', fallback);

    if (configured === undefined) {
      return fallback;
    }

    return Number.isInteger(configured) && configured >= 4 ? configured : fallback;
  }

  private createAccessToken(user: { id: number; email: string; role: string }): string {
    const payload: JwtTokenPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      userId: user.id,
      tokenType: 'access',
    };

    try {
      return sign(payload, this.getJwtPrivateKey(), {
        algorithm: 'RS256',
        expiresIn: this.getJwtExpiresIn(),
        jwtid: randomUUID(),
      });
    } catch {
      throw new InternalServerErrorException('Unable to sign access token');
    }
  }

  private createRefreshToken(user: { id: number; email: string; role: string }): string {
    const payload: JwtTokenPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      userId: user.id,
      tokenType: 'refresh',
    };

    try {
      return sign(payload, this.getJwtPrivateKey(), {
        algorithm: 'RS256',
        expiresIn: this.getJwtRefreshExpiresIn(),
        jwtid: randomUUID(),
      });
    } catch {
      throw new InternalServerErrorException('Unable to sign refresh token');
    }
  }

  private createPasswordResetToken(user: { id: number; email: string; role: string }): string {
    const payload: JwtTokenPayload = {
      sub: user.id.toString(),
      email: user.email,
      role: user.role,
      userId: user.id,
      tokenType: 'password-reset',
    };

    try {
      return sign(payload, this.getJwtPrivateKey(), {
        algorithm: 'RS256',
        expiresIn: this.getPasswordResetExpiresIn(),
        jwtid: randomUUID(),
      });
    } catch {
      throw new InternalServerErrorException('Unable to sign password reset token');
    }
  }

  private getJwtPrivateKey(): string {
    return this.jwtKeyService.getPrivateKey();
  }

  private getJwtPublicKey(): string {
    return this.jwtKeyService.getPublicKey();
  }

  private getJwtExpiresIn(): SignOptions['expiresIn'] {
    const configured = this.configService.get<string>('app.jwt.expiresIn', '15m');

    if (!configured) {
      return '15m';
    }

    const numericValue = Number(configured);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    return configured as SignOptions['expiresIn'];
  }

  private getJwtRefreshExpiresIn(): SignOptions['expiresIn'] {
    const configured = this.configService.get<string>('app.jwt.refreshExpiresIn', '7d');

    if (!configured) {
      return '7d';
    }

    const numericValue = Number(configured);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    return configured as SignOptions['expiresIn'];
  }

  private getPasswordResetExpiresIn(): SignOptions['expiresIn'] {
    const configured = this.configService.get<string>('app.jwt.passwordResetExpiresIn', '30m');

    if (!configured) {
      return '30m';
    }

    const numericValue = Number(configured);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }

    return configured as SignOptions['expiresIn'];
  }

  private buildAuthResult(user: AuthenticatedUser): AuthResult {
    const accessToken = this.createAccessToken(user);
    const refreshToken = this.createRefreshToken(user);
    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private verifyToken(token: string, expectedType: JwtTokenPayload['tokenType']): JwtTokenPayload {
    try {
      const payload = verify(token, this.getJwtPublicKey(), {
        algorithms: ['RS256'],
      }) as JwtTokenPayload;

      if (payload.tokenType !== expectedType) {
        throw new UnauthorizedException('Invalid token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
