import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const SAMPLE_CERT = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKexample
-----END CERTIFICATE-----`;

const SAMPLE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCexample
-----END PRIVATE KEY-----`;

test('AFIP config partial flow: private key then certificate', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afip-config-test-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  process.env.APP_DATA_DIR = tempDir;

  const { AfipConfigService } = await import('./afip-config.service');
  const service = new AfipConfigService();

  assert.throws(
    () => service.importCertificate({ certificado: SAMPLE_CERT }),
    /Save CUIT and private key/,
  );

  const partial = service.savePrivateKey({
    cuit: '20-12345678-9',
    clavePrivada: SAMPLE_KEY,
    puntoVenta: 2,
    production: false,
  });

  assert.equal(partial.configured, false);
  assert.equal(partial.pendingCertificate, true);
  assert.equal(partial.hasPrivateKey, true);
  assert.equal(partial.hasCertificate, false);
  assert.equal(partial.cuit, '20123456789');
  assert.equal(partial.puntoVenta, 2);

  const complete = service.importCertificate({ certificado: SAMPLE_CERT });

  assert.equal(complete.configured, true);
  assert.equal(complete.pendingCertificate, false);
  assert.equal(complete.hasCertificate, true);
  assert.equal(complete.hasPrivateKey, true);
});
