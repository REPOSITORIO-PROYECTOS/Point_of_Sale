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
  remoteRelayUrl: process.env.REMOTE_RELAY_URL ?? 'http://127.0.0.1:5090',
  remoteEnabled: process.env.REMOTE_ENABLED !== 'false',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-pos-jwt-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  devSkipLicense:
    process.env.NODE_ENV === 'development' && process.env.DEV_SKIP_LICENSE === 'true',
  licensePublicKeyPath: process.env.LICENSE_PUBLIC_KEY_PATH
    ? path.resolve(process.env.LICENSE_PUBLIC_KEY_PATH)
    : path.join(__dirname, '..', 'license', 'keys', 'license-public.pem'),
  licensePrivateKeyPath: process.env.LICENSE_PRIVATE_KEY_PATH
    ? path.resolve(process.env.LICENSE_PRIVATE_KEY_PATH)
    : path.resolve(process.cwd(), '..', 'tools', 'keys', 'license-private.pem'),
  supportRecoverySecret: process.env.SUPPORT_RECOVERY_SECRET,
};
