#!/usr/bin/env node
/**
 * Incrementa patch|minor|major en el package.json raíz y sincroniza el monorepo.
 * Uso: node scripts/version-bump.mjs patch
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const part = process.argv[2] ?? 'patch';
if (!['patch', 'minor', 'major'].includes(part)) {
  console.error('Uso: node scripts/version-bump.mjs [patch|minor|major]');
  process.exit(1);
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootPkgPath = path.join(repoRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const match = /^(\d+)\.(\d+)\.(\d+)(-[\w.]+)?$/.exec(pkg.version ?? '');
if (!match) {
  console.error(`Versión actual no semver: ${pkg.version}`);
  process.exit(1);
}

let major = Number(match[1]);
let minor = Number(match[2]);
let patch = Number(match[3]);
const prerelease = match[4] ?? '';
if (part === 'major') {
  major += 1;
  minor = 0;
  patch = 0;
} else if (part === 'minor') {
  minor += 1;
  patch = 0;
} else {
  patch += 1;
}

const next = `${major}.${minor}.${patch}${prerelease ?? ''}`;
const setVersion = path.join(repoRoot, 'scripts', 'set-version.mjs');
const result = spawnSync(process.execPath, [setVersion, next], { stdio: 'inherit', cwd: repoRoot });
process.exit(result.status ?? 1);
