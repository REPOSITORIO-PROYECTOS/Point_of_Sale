import { createPublicKey, createPrivateKey, sign, verify, type KeyObject } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  canonicalizeLicensePayload,
  LICENSE_PREFIX,
  type LicensePayload,
  parseLicensePayload,
} from './license-payload';

export type SignedLicense = {
  licenseKey: string;
  payload: LicensePayload;
  payloadJson: string;
};

export type LicenseVerificationResult = {
  valid: boolean;
  payload?: LicensePayload;
  reason?: string;
};

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

function fromBase64Url(value: string): Buffer | null {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    return null;
  }
}

export function loadPublicKey(pemPath?: string): KeyObject {
  const resolved =
    pemPath ??
    path.join(__dirname, 'keys', 'license-public.pem');

  const pem = fs.readFileSync(resolved, 'utf8');
  return createPublicKey(pem);
}

export function loadPrivateKey(pemPath: string): KeyObject {
  const pem = fs.readFileSync(pemPath, 'utf8');
  return createPrivateKey(pem);
}

export function signLicensePayload(payload: LicensePayload, privateKey: KeyObject): SignedLicense {
  const payloadJson = canonicalizeLicensePayload(payload);
  const signature = sign(null, Buffer.from(payloadJson, 'utf8'), privateKey);
  const licenseKey = `${LICENSE_PREFIX}.${toBase64Url(Buffer.from(payloadJson, 'utf8'))}.${toBase64Url(signature)}`;

  return { licenseKey, payload, payloadJson };
}

export function verifyLicenseKey(
  licenseKey: string,
  publicKey: KeyObject,
  expectedMachineId?: string,
  now: Date = new Date(),
): LicenseVerificationResult {
  const trimmed = licenseKey.trim();
  const parts = trimmed.split('.');

  if (parts.length !== 3 || parts[0] !== LICENSE_PREFIX) {
    return { valid: false, reason: 'Formato de licencia inválido' };
  }

  const payloadBuffer = fromBase64Url(parts[1]);
  const signatureBuffer = fromBase64Url(parts[2]);

  if (!payloadBuffer || !signatureBuffer) {
    return { valid: false, reason: 'Formato de licencia inválido' };
  }

  const payloadJson = payloadBuffer.toString('utf8');
  const signatureValid = verify(null, Buffer.from(payloadJson, 'utf8'), publicKey, signatureBuffer);

  if (!signatureValid) {
    return { valid: false, reason: 'Licencia no emitida por el proveedor' };
  }

  const payload = parseLicensePayload(payloadJson);
  if (!payload) {
    return { valid: false, reason: 'Contenido de licencia inválido' };
  }

  if (expectedMachineId && payload.machineId !== expectedMachineId) {
    return { valid: false, reason: 'Licencia no válida para esta máquina' };
  }

  if (payload.expiresAt) {
    const expiresAt = new Date(payload.expiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return { valid: false, reason: 'Fecha de expiración inválida' };
    }

    if (expiresAt.getTime() < now.getTime()) {
      return { valid: false, reason: 'Licencia expirada' };
    }
  }

  return { valid: true, payload };
}

export function maskClientNumber(clientNumber: string): string {
  if (clientNumber.length <= 2) {
    return '**';
  }

  const visible = clientNumber.slice(-2);
  return `${'*'.repeat(Math.max(clientNumber.length - 2, 2))}${visible}`;
}
