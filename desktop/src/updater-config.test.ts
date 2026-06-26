import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { parseUpdaterEnvContent } from './updater-config';

test('parseUpdaterEnvContent ignores comments and unsupported keys', () => {
  const parsed = parseUpdaterEnvContent(`
# comentario
GH_UPDATER_TOKEN=ghp_test
POS_DISABLE_AUTO_UPDATE=true
FOO=bar
MALFORMADA
`);

  assert.equal(parsed.GH_UPDATER_TOKEN, 'ghp_test');
  assert.equal(parsed.POS_DISABLE_AUTO_UPDATE, 'true');
  assert.equal(parsed.FOO, undefined);
});

test('loadUpdaterConfigFromAppData applies vars without overriding existing env', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-updater-'));
  const envPath = path.join(tempDir, 'updater.env');
  fs.writeFileSync(
    envPath,
    'GH_UPDATER_TOKEN=from_file\nPOS_DISABLE_AUTO_UPDATE=true\n',
    'utf8',
  );

  const previousAppData = process.env.APP_DATA_DIR;
  const previousToken = process.env.GH_UPDATER_TOKEN;
  const previousDisable = process.env.POS_DISABLE_AUTO_UPDATE;

  process.env.APP_DATA_DIR = tempDir;
  delete process.env.GH_UPDATER_TOKEN;
  delete process.env.POS_DISABLE_AUTO_UPDATE;

  const { loadUpdaterConfigFromAppData } = await import('./updater-config');
  const result = loadUpdaterConfigFromAppData();

  assert.equal(result.loaded, true);
  assert.equal(process.env.GH_UPDATER_TOKEN, 'from_file');
  assert.equal(process.env.POS_DISABLE_AUTO_UPDATE, 'true');

  process.env.GH_UPDATER_TOKEN = 'existing';
  loadUpdaterConfigFromAppData();
  assert.equal(process.env.GH_UPDATER_TOKEN, 'existing');

  if (previousAppData === undefined) delete process.env.APP_DATA_DIR;
  else process.env.APP_DATA_DIR = previousAppData;

  if (previousToken === undefined) delete process.env.GH_UPDATER_TOKEN;
  else process.env.GH_UPDATER_TOKEN = previousToken;

  if (previousDisable === undefined) delete process.env.POS_DISABLE_AUTO_UPDATE;
  else process.env.POS_DISABLE_AUTO_UPDATE = previousDisable;

  fs.rmSync(tempDir, { recursive: true, force: true });
});
