import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

const ensureDatabaseUrl = (): string => {
  const fallbackUrl = 'file:./dev.db';
  const url = process.env.DATABASE_URL ?? fallbackUrl;
  process.env.DATABASE_URL = url;
  return url;
};

const ensureSchemaForTests = (databaseUrl: string): void => {
  if (process.env.NODE_ENV !== 'test') {
    return;
  }

  const filePath = databaseUrl.startsWith('file:') ? databaseUrl.replace('file:', '') : null;
  const resolved = filePath ? resolve(filePath) : null;
  const databaseExists = resolved ? existsSync(resolved) : false;

  if (databaseExists) {
    return;
  }

  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'ignore',
  });
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const databaseUrl = ensureDatabaseUrl();
    ensureSchemaForTests(databaseUrl);
    super({ datasources: { db: { url: databaseUrl } } });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  enableShutdownHooks(app: INestApplication): void {
    process.on('beforeExit', () => {
      void app.close();
    });
  }
}
