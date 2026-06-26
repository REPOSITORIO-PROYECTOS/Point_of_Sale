import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const desktopRoot = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(desktopRoot, 'src');

test('desktop shell source files exist', () => {
  for (const file of [
    'main.ts',
    'preload.ts',
    'local-services.ts',
    'paths.ts',
    'auto-updater.ts',
    'updater-config.ts',
  ]) {
    assert.ok(fs.existsSync(path.join(srcDir, file)), `missing ${file}`);
  }
});

test('desktop package exposes compiled entrypoint', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8')) as {
    main: string;
  };
  assert.equal(pkg.main, 'dist/main.js');
});

test('preload exposes print bridge contract', () => {
  const preloadSource = fs.readFileSync(path.join(srcDir, 'preload.ts'), 'utf8');
  assert.match(preloadSource, /printReceipt/);
  assert.match(preloadSource, /checkForUpdates/);
  assert.match(preloadSource, /contextBridge/);
});

test('auto-updater supports public GitHub feed without token', () => {
  const source = fs.readFileSync(path.join(srcDir, 'updater-config.ts'), 'utf8');
  assert.match(source, /POS_UPDATER_PUBLIC_REPO/);
  assert.match(source, /canRunAutoUpdater/);
});

test('auto-updater skips without token and uses Bearer auth', () => {
  const source = fs.readFileSync(path.join(srcDir, 'auto-updater.ts'), 'utf8');
  assert.match(source, /loadUpdaterConfigFromAppData/);
  assert.match(source, /registerSkippedIpc/);
  assert.match(source, /Bearer \$\{token\}/);
  assert.match(source, /toFriendlyErrorMessage/);
  assert.doesNotMatch(source, /Authorization: `token \$\{token\}`/);
});

test('updater.env.example exists at repo root', () => {
  const examplePath = path.join(desktopRoot, '..', 'updater.env.example');
  assert.ok(fs.existsSync(examplePath), 'missing updater.env.example');
  const content = fs.readFileSync(examplePath, 'utf8');
  assert.match(content, /GH_UPDATER_TOKEN/);
});
