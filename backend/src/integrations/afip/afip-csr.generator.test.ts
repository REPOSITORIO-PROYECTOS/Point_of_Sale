import assert from 'node:assert/strict';
import { createPrivateKey } from 'node:crypto';
import test from 'node:test';
import { generateAfipCsr } from './afip-csr.generator';

function decodeCsrDer(csrPem: string): Buffer {
  const body = csrPem
    .replace('-----BEGIN CERTIFICATE REQUEST-----', '')
    .replace('-----END CERTIFICATE REQUEST-----', '')
    .replace(/\s/g, '');

  return Buffer.from(body, 'base64');
}

test('generateAfipCsr produces AFIP-compatible PEM CSR and PKCS#8 private key', () => {
  const result = generateAfipCsr({
    cuit: '20-12345678-9',
    organization: 'EmpresaPrueba',
    commonName: 'PointOfSale',
  });

  assert.match(result.privateKeyPem, /BEGIN PRIVATE KEY/);
  assert.match(result.csrPem, /BEGIN CERTIFICATE REQUEST/);
  assert.match(result.csrPem, /END CERTIFICATE REQUEST/);

  const privateKey = createPrivateKey(result.privateKeyPem);
  assert.equal(privateKey.asymmetricKeyType, 'rsa');

  const csrDer = decodeCsrDer(result.csrPem);
  assert.equal(csrDer[0], 0x30);
  assert.ok(csrDer.includes(Buffer.from('CUIT 20123456789')));
  assert.ok(csrDer.includes(Buffer.from('EmpresaPrueba')));
  assert.ok(csrDer.includes(Buffer.from('PointOfSale')));
  assert.ok(csrDer.includes(Buffer.from('AR')));
});
