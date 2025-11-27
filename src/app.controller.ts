import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/db-check')
  async dbCheck() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error) {
      // Convertimos 'unknown' en un objeto seguro para evitar ESLint errors
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      return {
        status: 'error',
        database: 'failed',
        message,
      };
    }
  }
}
