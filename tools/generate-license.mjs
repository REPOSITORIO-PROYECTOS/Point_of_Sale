#!/usr/bin/env node
/**
 * Generador de licencias POS (uso interno del equipo).
 *
 * Ejemplo:
 *   node tools/generate-license.mjs --client 00042 --license-id CLI-00042 --machine-id <sha256> --expires 2027-12-31
 */
import { createPrivateKey, sign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LICENSE_PREFIX = 'POS-LIC-v1';
const LICENSE_FEATURES = ['pos', 'afip', 'remote'];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultPrivateKeyPath = path.join(__dirname, 'keys', 'license-private.pem');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function canonicalizePayload(payload) {
  const ordered = {
    v: payload.v,
    licenseId: payload.licenseId,
    clientNumber: payload.clientNumber,
    machineId: payload.machineId,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    features: [...payload.features].sort(),
  };
  return JSON.stringify(ordered);
}

function toBase64Url(buffer) {
  return buffer.toString('base64url');
}

function signPayload(payload, privateKeyPem) {
  const privateKey = createPrivateKey(privateKeyPem);
  const payloadJson = canonicalizePayload(payload);
  const signature = sign(null, Buffer.from(payloadJson, 'utf8'), privateKey);
  return `${LICENSE_PREFIX}.${toBase64Url(Buffer.from(payloadJson, 'utf8'))}.${toBase64Url(signature)}`;
}

function usage() {
  console.error(`Uso:
  node tools/generate-license.mjs \\
    --client <numero-cliente> \\
    --license-id <id-unico> \\
    --machine-id <sha256-de-la-maquina> \\
    [--expires <YYYY-MM-DD>] \\
    [--features pos,afip,remote] \\
    [--private-key <ruta-pem>]`);
  process.exit(1);
}

const args = parseArgs(process.argv.slice(2));
if (!args.client || !args['license-id'] || !args['machine-id']) {
  usage();
}

const privateKeyPath = args['private-key'] ?? defaultPrivateKeyPath;
if (!fs.existsSync(privateKeyPath)) {
  console.error(`Clave privada no encontrada: ${privateKeyPath}`);
  process.exit(1);
}

const features = typeof args.features === 'string'
  ? args.features.split(',').map((value) => value.trim()).filter(Boolean)
  : [...LICENSE_FEATURES];

const payload = {
  v: 1,
  licenseId: String(args['license-id']),
  clientNumber: String(args.client),
  machineId: String(args['machine-id']),
  issuedAt: new Date().toISOString(),
  expiresAt: args.expires ? new Date(`${args.expires}T23:59:59.999Z`).toISOString() : null,
  features,
};

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');
const licenseKey = signPayload(payload, privateKeyPem);
process.stdout.write(`${licenseKey}\n`);
