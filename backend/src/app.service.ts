import { Injectable } from '@nestjs/common';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './config/env.config';

function readPackageVersion(relativeToBackend: string): string {
  try {
    const packagePath = path.resolve(process.cwd(), relativeToBackend);
    const raw = fs.readFileSync(packagePath, 'utf8');
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return '0.0.1';
  }
}

@Injectable()
export class AppService {
  getVersion() {
    return {
      name: 'point-of-sale',
      version: readPackageVersion('../package.json'),
      components: {
        backend: readPackageVersion('package.json'),
        frontend: readPackageVersion('../frontend/package.json'),
        desktop: readPackageVersion('../desktop/package.json'),
      },
      nodeEnv: env.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }

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
