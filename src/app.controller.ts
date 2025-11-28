import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as packageJson from '../package.json';

@Controller()
export class AppController {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  // ROOT "/"
  @Get('/')
  root() {
    return {
      status: 'online',
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }

  // Health check completo
  @Get('/health')
  async health() {
    // Verificar DB
    let dbStatus = 'connected';

    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
    } catch (err) {
      dbStatus = 'failed';
    }

    return {
      status: 'online',
      version: (packageJson as any).version,
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.round((Date.now() - this.startTime) / 1000),
      database: dbStatus,
    };
  }

  // Health de DB (endpoint simple)
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
