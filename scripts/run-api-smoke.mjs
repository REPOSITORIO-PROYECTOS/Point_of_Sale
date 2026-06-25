#!/usr/bin/env node
/**
 * Smoke E2E aislado: crea SQLite temporal, levanta pos-api, corre api.smoke.test.ts y apaga.
 * No depende de database.sqlite de dev ni de credenciales del operador.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = path.join(repoRoot, 'backend');
const smokeDb = path.join(backendDir, 'storage', 'smoke-test.sqlite');
const port = process.env.POS_SMOKE_PORT ?? '3098';
const apiUrl = `http://127.0.0.1:${port}/api`;
const attach = process.env.POS_SMOKE_ATTACH === '1';

function log(message) {
  console.log(`[smoke] ${message}`);
}

function removeSqliteArtifacts(dbPath) {
  for (const suffix of ['', '-wal', '-shm']) {
    const candidate = `${dbPath}${suffix}`;
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
}

function ensureBackendBuild() {
  const mainEntry = path.join(backendDir, 'dist', 'main.js');
  if (fs.existsSync(mainEntry)) {
    return;
  }

  log('Compilando backend (falta dist/)...');
  const build = spawnSync('npm', ['run', 'build'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  if (build.status !== 0) {
    throw new Error('npm run build --prefix backend falló');
  }
}

function initSmokeDatabase() {
  log(`Inicializando BD aislada: ${smokeDb}`);
  removeSqliteArtifacts(smokeDb);

  const init = spawnSync('node', ['dist/database/init-db.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      SQLITE_DB_PATH: smokeDb,
      DEV_SKIP_LICENSE: 'true',
      NODE_ENV: 'development',
    },
    stdio: 'inherit',
  });

  if (init.status !== 0) {
    throw new Error('init-db falló para smoke-test.sqlite');
  }
}

async function waitForApi(timeoutMs = 60_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return;
      }
    } catch {
      // API aún no lista
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`pos-api no respondió en ${apiUrl} dentro de ${timeoutMs}ms`);
}

function killPortListeners(targetPort) {
  if (process.platform === 'win32') {
    spawnSync(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Get-NetTCPConnection -LocalPort ${targetPort} -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: 'ignore' },
    );
    return;
  }

  spawnSync('sh', ['-c', `lsof -ti tcp:${targetPort} | xargs -r kill -9`], { stdio: 'ignore' });
}

function startApiProcess() {
  log(`Levantando pos-api en ${apiUrl}`);
  killPortListeners(port);

  const child = spawn('node', ['dist/main.js'], {
    cwd: backendDir,
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: port,
      SQLITE_DB_PATH: smokeDb,
      APP_DATA_DIR: path.join(backendDir, 'storage', 'smoke-appdata'),
      DEV_SKIP_LICENSE: 'true',
      REMOTE_ENABLED: 'false',
      NODE_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  child.stdout?.on('data', (chunk) => process.stdout.write(chunk));
  child.stderr?.on('data', (chunk) => process.stderr.write(chunk));

  return child;
}

function runSmokeTests() {
  log('Ejecutando api.smoke.test.ts (setup + productos + caja + venta)...');

  return spawnSync('npx', ['tsx', '--test', '--test-concurrency=1', 'src/api.smoke.test.ts'], {
    cwd: backendDir,
    env: {
      ...process.env,
      POS_API_URL: apiUrl,
      POS_TEST_USERNAME: 'smoke-admin',
      POS_TEST_PASSWORD: 'smoke-test-pass-123',
    },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

async function main() {
  let apiProcess = null;

  try {
    if (attach) {
      log(`POS_SMOKE_ATTACH=1 — usando API existente en ${apiUrl}`);
      await waitForApi();
    } else {
      ensureBackendBuild();
      initSmokeDatabase();
      apiProcess = startApiProcess();
      await waitForApi();
    }

    const result = runSmokeTests();
    if (result.status !== 0) {
      process.exitCode = result.status ?? 1;
    }
  } catch (error) {
    console.error('[smoke] Error:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    if (apiProcess && !apiProcess.killed) {
      log('Apagando pos-api de smoke...');
      apiProcess.kill('SIGTERM');
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (!apiProcess.killed) {
        apiProcess.kill('SIGKILL');
      }
    }
  }
}

main();
