import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/db-check')
  async dbCheck() {
    try {
      // Se usa $queryRawUnsafe para evitar problemas con ESLint
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error: unknown) {
      const err = error as Error;

      return {
        status: 'error',
        database: 'failed',
        message: err.message,
      };
    }
  }
}
