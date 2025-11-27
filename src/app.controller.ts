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
      if (error instanceof Error) {
        return {
          status: 'error',
          database: 'failed',
          message: error.message,
        };
      }

      return {
        status: 'error',
        database: 'failed',
        message: 'Unknown error',
      };
    }
  }
}
