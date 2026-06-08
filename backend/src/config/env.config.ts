import 'dotenv/config';
import path from 'node:path';
import { ensureDesktopPaths, getDesktopPaths } from './desktop-paths';

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const desktopPaths = getDesktopPaths();
ensureDesktopPaths(desktopPaths);

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: toNumber(process.env.PORT, 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  enableSwagger: process.env.ENABLE_SWAGGER !== 'false',
  appDataDir: desktopPaths.appDataDir,
  uploadsDir: desktopPaths.uploadsDir,
  logsDir: desktopPaths.logsDir,
  sqliteDbPath: process.env.SQLITE_DB_PATH
    ? path.resolve(process.env.SQLITE_DB_PATH)
    : desktopPaths.sqliteDbPath,
  afipServiceUrl: process.env.AFIP_SERVICE_URL ?? 'http://127.0.0.1:5086',
  afipPuntoVenta: toNumber(process.env.AFIP_PUNTO_VENTA, 1),
  afipProduction: process.env.AFIP_PRODUCTION === 'true',
};
