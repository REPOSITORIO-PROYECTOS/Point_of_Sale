import fs from 'node:fs';
import path from 'node:path';
import { env } from '@/config/env.config';
import type { AfipStoredConfig } from './afip-config.types';

const configFileName = 'config.json';
const certificateFileName = 'user.crt';
const privateKeyFileName = 'user.key';

export function getAfipStorageDir() {
  return path.join(env.appDataDir, 'afip');
}

export function getAfipConfigPath() {
  return path.join(getAfipStorageDir(), configFileName);
}

export function getAfipCertificatePath() {
  if (process.env.AFIP_CERT_PATH) {
    return path.resolve(process.env.AFIP_CERT_PATH);
  }

  return path.join(getAfipStorageDir(), certificateFileName);
}

export function getAfipPrivateKeyPath() {
  if (process.env.AFIP_KEY_PATH) {
    return path.resolve(process.env.AFIP_KEY_PATH);
  }

  return path.join(getAfipStorageDir(), privateKeyFileName);
}

export function ensureAfipStorageDir() {
  fs.mkdirSync(getAfipStorageDir(), { recursive: true });
}

export function readStoredAfipConfig(): AfipStoredConfig | null {
  const configPath = getAfipConfigPath();

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as AfipStoredConfig;

    if (!parsed.cuit) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAfipConfig(config: AfipStoredConfig) {
  ensureAfipStorageDir();
  fs.writeFileSync(getAfipConfigPath(), JSON.stringify(config, null, 2), 'utf8');
}

export function writeAfipCertificate(content: string) {
  ensureAfipStorageDir();
  fs.writeFileSync(getAfipCertificatePath(), normalizePem(content), 'utf8');
}

export function writeAfipPrivateKey(content: string) {
  ensureAfipStorageDir();
  fs.writeFileSync(getAfipPrivateKeyPath(), normalizePem(content), 'utf8');
}

export function readAfipCertificate() {
  const certPath = getAfipCertificatePath();

  if (!fs.existsSync(certPath)) {
    throw new Error(`AFIP certificate not found at ${certPath}`);
  }

  return fs.readFileSync(certPath, 'utf8');
}

export function readAfipPrivateKey() {
  const keyPath = getAfipPrivateKeyPath();

  if (!fs.existsSync(keyPath)) {
    throw new Error(`AFIP private key not found at ${keyPath}`);
  }

  return fs.readFileSync(keyPath, 'utf8');
}

export function hasAfipCertificateFile() {
  return fs.existsSync(getAfipCertificatePath());
}

export function hasAfipPrivateKeyFile() {
  return fs.existsSync(getAfipPrivateKeyPath());
}

function normalizePem(content: string) {
  return content.replace(/\r\n/g, '\n').trim() + '\n';
}

export function validateCuit(cuit: string) {
  const normalized = cuit.replace(/\D/g, '');

  if (!/^\d{11}$/.test(normalized)) {
    throw new Error('CUIT must contain exactly 11 digits');
  }

  return normalized;
}

export function validateCertificatePem(content: string) {
  const normalized = normalizePem(content);

  if (!normalized.includes('BEGIN CERTIFICATE')) {
    throw new Error('Certificate must be a PEM file containing BEGIN CERTIFICATE');
  }

  return normalized;
}

export function validatePrivateKeyPem(content: string) {
  const normalized = normalizePem(content);

  if (
    !normalized.includes('BEGIN PRIVATE KEY') &&
    !normalized.includes('BEGIN RSA PRIVATE KEY') &&
    !normalized.includes('BEGIN ENCRYPTED PRIVATE KEY')
  ) {
    throw new Error('Private key must be a PEM file containing BEGIN PRIVATE KEY');
  }

  if (normalized.includes('BEGIN ENCRYPTED PRIVATE KEY')) {
    throw new Error('Encrypted private keys are not supported. Convert the key to PKCS#8 without passphrase.');
  }

  return normalized;
}
