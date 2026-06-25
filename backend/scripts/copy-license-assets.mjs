import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(backendRoot, 'src/license/keys/license-public.pem');
const dst = path.join(backendRoot, 'dist/license/keys/license-public.pem');

if (!fs.existsSync(src)) {
  console.warn(
    'license-public.pem no está en src/license/keys/ (ok en dev con DEV_SKIP_LICENSE=true)',
  );
  process.exit(0);
}

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log('license-public.pem copiado a dist/license/keys/');
