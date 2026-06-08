import { Injectable } from '@nestjs/common';
import { env } from './config/env.config';

@Injectable()
export class AppService {
  getStatus() {
    return {
      service: 'point-of-sale-backend',
      status: 'ok',
      host: env.host,
      port: env.port,
      appDataDir: env.appDataDir,
      sqliteDbPath: env.sqliteDbPath,
      timestamp: new Date().toISOString(),
    };
  }
}
