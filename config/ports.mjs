import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));
const ports = JSON.parse(readFileSync(join(configDir, 'ports.json'), 'utf8'));

export const POS_PORTS = ports;

export function frontendOrigin(host = 'localhost') {
  return `http://${host}:${ports.frontend}`;
}

export function apiOrigin(host = '127.0.0.1') {
  return `http://${host}:${ports.api}`;
}

export function apiBaseUrl(host = '127.0.0.1') {
  return `${apiOrigin(host)}/api`;
}

export function afipOrigin(host = '127.0.0.1') {
  return `http://${host}:${ports.afip}`;
}
