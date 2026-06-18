import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { LogoStorageService, THEME_LOGO_API_PATH } from './logo-storage.service';

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const tinyPngDataUrl = `data:image/png;base64,${tinyPngBase64}`;

function withTempBrandingDir(run: (brandingDir: string) => void) {
  const previousAppDataDir = process.env.APP_DATA_DIR;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-logo-test-'));
  const brandingDir = path.join(tempRoot, 'branding');
  fs.mkdirSync(brandingDir, { recursive: true });
  process.env.APP_DATA_DIR = tempRoot;

  try {
    run(brandingDir);
  } finally {
    if (previousAppDataDir === undefined) {
      delete process.env.APP_DATA_DIR;
    } else {
      process.env.APP_DATA_DIR = previousAppDataDir;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

test('LogoStorageService saves PNG and exposes API path on migration', () => {
  withTempBrandingDir((brandingDir) => {
    const service = new LogoStorageService();
    const migrated = service.migrateLegacyLogoReference(tinyPngDataUrl);

    assert.equal(migrated, THEME_LOGO_API_PATH);
    assert.ok(fs.existsSync(path.join(brandingDir, 'logo.png')));
    assert.ok(service.hasStoredLogo());

    const stored = service.findStoredLogo();
    assert.equal(stored?.contentType, 'image/png');
    assert.ok(stored?.buffer.length);
  });
});

test('LogoStorageService rejects logos larger than 2 MB', () => {
  withTempBrandingDir(() => {
    const service = new LogoStorageService();
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1);

    assert.throws(
      () => service.saveLogoBuffer(oversized, 'image/png'),
      /2 MB/,
    );
  });
});
