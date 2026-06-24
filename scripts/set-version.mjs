#!/usr/bin/env node
/**
 * Fija la versión en todos los package.json del monorepo.
 * Uso: node scripts/set-version.mjs 0.0.2
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2]?.replace(/^v/, '');
if (!version || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version)) {
  console.error('Uso: node scripts/set-version.mjs <semver>  (ej. 0.0.2 o v0.0.2)');
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'package.json',
  'frontend/package.json',
  'backend/package.json',
  'desktop/package.json',
];

for (const relativePath of files) {
  const filePath = path.join(repoRoot, relativePath);
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`${relativePath} → ${version}`);
}
