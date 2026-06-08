import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateCertificatePem,
  validateCuit,
  validatePrivateKeyPem,
} from './afip-config.storage';

const SAMPLE_CERT = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKexample
-----END CERTIFICATE-----`;

const SAMPLE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCexample
-----END PRIVATE KEY-----`;

test('validateCuit accepts 11 digits and strips separators', () => {
  assert.equal(validateCuit('20-12345678-9'), '20123456789');
});

test('validateCuit rejects invalid values', () => {
  assert.throws(() => validateCuit('123'), /11 digits/);
});

test('validateCertificatePem requires PEM header', () => {
  assert.throws(() => validateCertificatePem('not-a-pem'), /BEGIN CERTIFICATE/);
  assert.match(validateCertificatePem(SAMPLE_CERT), /BEGIN CERTIFICATE/);
});

test('validatePrivateKeyPem rejects encrypted keys', () => {
  const encrypted = `-----BEGIN ENCRYPTED PRIVATE KEY-----\nabc\n-----END ENCRYPTED PRIVATE KEY-----\n`;
  assert.throws(() => validatePrivateKeyPem(encrypted), /Encrypted private keys/);
  assert.match(validatePrivateKeyPem(SAMPLE_KEY), /BEGIN PRIVATE KEY/);
});
