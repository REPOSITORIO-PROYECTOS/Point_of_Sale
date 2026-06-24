#!/usr/bin/env node
/**
 * Sincroniza la versión del package.json raíz a frontend, backend y desktop.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootPkgPath = path.join(repoRoot, 'package.json');
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const version = rootPkg.version;

if (!version || typeof version !== 'string') {
  console.error('sync-version: falta version en package.json raíz');
  process.exit(1);
}

const targets = [
  'frontend/package.json',
  'backend/package.json',
  'desktop/package.json',
];

for (const relativePath of targets) {
  const filePath = path.join(repoRoot, relativePath);
  const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (pkg.version === version) {
    console.log(`${relativePath}: ya en ${version}`);
    continue;
  }
  pkg.version = version;
  fs.writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`${relativePath}: ${version}`);
}

console.log(`Versión unificada: ${version}`);
