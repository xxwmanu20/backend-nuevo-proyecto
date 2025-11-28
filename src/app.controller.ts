import { Controller, Get } from '@nestjs/common';

interface ServiceInfo {
  status: string;
  service: string;
  timestamp: string;
}

interface VersionInfo {
  version: string;
}

@Controller()
export class AppController {
  @Get('health')
  getHealth(): ServiceInfo {
    return {
      status: 'online',
      service: 'backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  getVersion(): VersionInfo {
    const version = process.env.npm_package_version ?? 'unknown';

    return { version };
  }
}
