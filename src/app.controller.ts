import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  // NEW: endpoint para "/"
  @Get('/')
  root() {
    return {
      status: 'online',
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/db-check')
  async dbCheck() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');

      return {
        status: 'ok',
        database: 'connected',
      };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('Unknown error');

      return {
        status: 'error',
        database: 'failed',
        message: err.message,
      };
    }
  }
}
