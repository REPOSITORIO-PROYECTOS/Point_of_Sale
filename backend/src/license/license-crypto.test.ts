import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import {
  loadPrivateKey,
  loadPublicKey,
  signLicensePayload,
  verifyLicenseKey,
} from './license-crypto';
import type { LicensePayload } from './license-payload';
import { buildLicensePayload } from './license.service';

const repoRoot = path.resolve(process.cwd(), '..');
const teamPublicKeyPath = path.join(repoRoot, 'backend/src/license/keys/license-public.pem');
const teamPrivateKeyPath = path.join(repoRoot, 'tools/keys/license-private.pem');

function samplePayload(machineId: string): LicensePayload {
  return {
    v: 1,
    licenseId: 'CLI-00042',
    clientNumber: '00042',
    machineId,
    issuedAt: '2026-06-18T12:00:00.000Z',
    expiresAt: '2027-12-31T23:59:59.999Z',
    features: ['pos', 'afip', 'remote'],
  };
}

test('sign + verify roundtrip with generated key pair', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const machineId = 'abc123machinehash';
  const signed = signLicensePayload(samplePayload(machineId), privateKey);
  const result = verifyLicenseKey(signed.licenseKey, publicKey, machineId);

  assert.equal(result.valid, true);
  assert.equal(result.payload?.licenseId, 'CLI-00042');
  assert.equal(result.payload?.clientNumber, '00042');
});

test('reject license for wrong machineId', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const signed = signLicensePayload(samplePayload('machine-a'), privateKey);
  const result = verifyLicenseKey(signed.licenseKey, publicKey, 'machine-b');

  assert.equal(result.valid, false);
  assert.match(result.reason ?? '', /máquina/i);
});

test('reject tampered payload', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const machineId = 'machine-a';
  const signed = signLicensePayload(samplePayload(machineId), privateKey);
  const parts = signed.licenseKey.split('.');
  const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
  const result = verifyLicenseKey(tampered, publicKey, machineId);

  assert.equal(result.valid, false);
});

test('reject forged license signed with different key', () => {
  const legit = generateKeyPairSync('ed25519');
  const forged = generateKeyPairSync('ed25519');
  const machineId = 'machine-a';
  const signed = signLicensePayload(samplePayload(machineId), forged.privateKey);
  const result = verifyLicenseKey(signed.licenseKey, legit.publicKey, machineId);

  assert.equal(result.valid, false);
  assert.match(result.reason ?? '', /proveedor/i);
});

test('reject unsigned or malformed license', () => {
  const { publicKey } = generateKeyPairSync('ed25519');
  const malformed = verifyLicenseKey('POS-OLD-FORMAT', publicKey);
  assert.equal(malformed.valid, false);

  const missingPart = verifyLicenseKey('POS-LIC-v1.payload-only', publicKey);
  assert.equal(missingPart.valid, false);
});

test('team key pair signs and verifies when private key is present', () => {
  let privateKey;
  try {
    privateKey = loadPrivateKey(teamPrivateKeyPath);
  } catch {
    return;
  }

  const publicKey = loadPublicKey(teamPublicKeyPath);
  const machineId = 'integration-machine-id';
  const payload = buildLicensePayload({
    licenseId: 'CLI-TEST',
    clientNumber: 'TEST',
    machineId,
    expiresAt: '2027-12-31T23:59:59.999Z',
  });
  const signed = signLicensePayload(payload, privateKey);
  const result = verifyLicenseKey(signed.licenseKey, publicKey, machineId);
  assert.equal(result.valid, true);
});
