/**
 * Offline support export — run without API when recovery secret is set.
 *
 * Usage (PowerShell):
 *   $env:SUPPORT_RECOVERY_SECRET = "your-32-char-minimum-secret"
 *   npm run support:export --prefix backend
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { env } from '../src/config/env.config';

function assertRecoverySecret() {
  const secret = process.env.SUPPORT_RECOVERY_SECRET;
  if (!secret || secret.length < 32) {
    console.error('SUPPORT_RECOVERY_SECRET debe tener al menos 32 caracteres.');
    process.exit(1);
  }
  return secret;
}

function main() {
  assertRecoverySecret();

  const dbPath = env.sqliteDbPath;
  if (!existsSync(dbPath)) {
    console.error(`Base de datos no encontrada: ${dbPath}`);
    process.exit(1);
  }

  const outputDir = path.join(env.appDataDir, 'support-exports');
  mkdirSync(outputDir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(outputDir, `pos-backup-${stamp}.sqlite`);
  copyFileSync(dbPath, backupPath);

  const manifest = {
    exportedAt: new Date().toISOString(),
    dbPath,
    backupPath,
    auditFingerprint: createHash('sha256').update(backupPath).digest('hex'),
    note: 'Export offline de soporte — no incluye claves AFIP por separado',
  };

  const manifestPath = path.join(outputDir, `manifest-${stamp}.json`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Backup SQLite: ${backupPath}`);
  console.log(`Manifiesto: ${manifestPath}`);
}

main();
