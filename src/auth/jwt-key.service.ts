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
      'app.jwt.privateKey',
      'app.jwt.privateKeyPath',
      'JWT private key is not configured',
      'Unable to load JWT private key',
    );
  }

  getPublicKey(): string {
    // Log temporal para depuración
    const rawValue = this.configService.get<string>('app.jwt.publicKey');
    console.log('Valor JWT_PUBLIC_KEY desde config:', rawValue);
    return this.getKey(
      'public',
      'app.jwt.publicKey',
      'app.jwt.publicKeyPath',
      'JWT public key is not configured',
      'Unable to load JWT public key',
    );
  }

  private getKey(
    kind: KeyKind,
    valueConfigKey: string,
    pathConfigKey: string,
    missingMessage: string,
    loadErrorMessage: string,
  ): string {
    const cached = this.cache[kind];

    if (cached) {
      return cached;
    }

    const inlineKey = this.normalizeKey(this.configService.get<string>(valueConfigKey) ?? '');

    if (inlineKey) {
      this.cache[kind] = inlineKey;
      return inlineKey;
    }

    const path = this.configService.get<string>(pathConfigKey);

    if (!path) {
      throw new InternalServerErrorException(missingMessage);
    }

    try {
      const key = this.normalizeKey(readFileSync(path, 'utf8'));

      if (!key) {
        throw new Error('Key file empty');
      }

      this.cache[kind] = key;
      return key;
    } catch {
      throw new InternalServerErrorException(loadErrorMessage);
    }
  }

  private normalizeKey(content: string): string {
    if (!content) {
      return '';
    }

    const trimmed = content.trim();

    if (!trimmed) {
      return '';
    }

    if (trimmed.includes('\n')) {
      return trimmed;
    }

    return trimmed.replace(/\\n/g, '\n');
  }
}
