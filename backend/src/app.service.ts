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
      afipConfigured: Boolean(env.afipServiceUrl),
      afipServiceUrl: env.afipServiceUrl,
      afipProduction: env.afipProduction,
      architecture: 'pos-api consumes AFIP as HTTP microservice',
      timestamp: new Date().toISOString(),
    };
  }
}
