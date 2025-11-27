import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '8080', 10),
  databaseUrl: process.env.DATABASE_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? '',
  jwt: {
    privateKey: process.env.JWT_PRIVATE_KEY ?? process.env.APP_JWT_PRIVATE_KEY ?? '',
    privateKeyPath: process.env.JWT_PRIVATE_KEY_PATH ?? '',
    publicKey: process.env.JWT_PUBLIC_KEY ?? process.env.APP_JWT_PUBLIC_KEY ?? '',
    publicKeyPath: process.env.JWT_PUBLIC_KEY_PATH ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    passwordResetExpiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN ?? '30m',
  },
  bcrypt: {
    saltRounds: (() => {
      const fallback = 10;
      const raw = process.env.BCRYPT_SALT_ROUNDS;
      if (raw === undefined) {
        return fallback;
      }

      const parsed = Number.parseInt(raw, 10);
      return Number.isNaN(parsed) || parsed < 4 ? fallback : parsed;
    })(),
  },
}));
