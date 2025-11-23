import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFileSync } from 'fs';

type KeyKind = 'private' | 'public';

@Injectable()
export class JwtKeyService {
  private readonly cache: Record<KeyKind, string | undefined> = {
    private: undefined,
    public: undefined,
  };

  constructor(private readonly configService: ConfigService) {}

  getPrivateKey(): string {
    return this.getKey(
      'private',
      'app.jwt.privateKeyPath',
      'JWT private key path is not configured',
      'Unable to load JWT private key',
    );
  }

  getPublicKey(): string {
    return this.getKey(
      'public',
      'app.jwt.publicKeyPath',
      'JWT public key path is not configured',
      'Unable to load JWT public key',
    );
  }

  private getKey(
    kind: KeyKind,
    configKey: string,
    missingMessage: string,
    loadErrorMessage: string,
  ): string {
    const cached = this.cache[kind];

    if (cached) {
      return cached;
    }

    const path = this.configService.get<string>(configKey);

    if (!path) {
      throw new InternalServerErrorException(missingMessage);
    }

    try {
      const key = readFileSync(path, 'utf8');

      if (!key.trim()) {
        throw new Error('Key file empty');
      }

      this.cache[kind] = key;
      return key;
    } catch {
      throw new InternalServerErrorException(loadErrorMessage);
    }
  }
}
