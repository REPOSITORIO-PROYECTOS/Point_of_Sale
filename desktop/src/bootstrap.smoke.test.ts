import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const desktopRoot = path.resolve(import.meta.dirname, '..');
const srcDir = path.join(desktopRoot, 'src');

test('desktop shell source files exist', () => {
  for (const file of ['main.ts', 'preload.ts', 'local-services.ts', 'paths.ts']) {
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
  assert.match(preloadSource, /contextBridge/);
});
