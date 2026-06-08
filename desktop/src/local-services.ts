import { execSync, fork, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  ensureDesktopAppDataDir,
  getAfipCertDir,
  getAfipHealthUrl,
  getApiHealthUrl,
  resolveAfipSidecarExecutable,
  resolveBackendCwd,
  resolveBackendEntry,
  resolveBundledNodeExecutable,
} from './paths';

type ManagedProcess = {
  name: string;
  process: ChildProcess;
};

const managedProcesses: ManagedProcess[] = [];

function attachLogs(name: string, proc: ChildProcess) {
  proc.stdout?.on('data', (chunk) => {
    console.log(`[${name}] ${chunk.toString()}`);
  });

  proc.stderr?.on('data', (chunk) => {
    console.error(`[${name}] ${chunk.toString()}`);
  });

  proc.on('exit', (code, signal) => {
    console.error(`[${name}] process exited code=${code} signal=${signal ?? 'none'}`);
  });
}

async function waitForUrl(url: string, timeoutMs: number, required: boolean) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok) {
        return true;
      }
    } catch {
      // retry
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (required) {
    throw new Error(`Service did not become ready at ${url}`);
  }

  console.warn(`[local-services] Optional service not ready: ${url}`);
  return false;
}

export function shouldSpawnAfipSidecar(isPackaged: boolean) {
  if (process.env.SPAWN_AFIP_SIDECAR === 'false') {
    return false;
  }

  if (process.env.SPAWN_AFIP_SIDECAR === 'true') {
    return true;
  }

  const sidecarExecutable = resolveAfipSidecarExecutable(isPackaged);
  return Boolean(sidecarExecutable && fs.existsSync(sidecarExecutable));
}

function hasSystemNode() {
  try {
    execSync('node --version', { stdio: 'ignore', windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

function resolveBackendRuntime(isDev: boolean, isPackaged: boolean) {
  if (isDev) {
    return { mode: 'spawn-node' as const, command: 'node' };
  }

  if (process.env.POS_BACKEND_NODE) {
    return { mode: 'spawn-node' as const, command: process.env.POS_BACKEND_NODE };
  }

  const bundledNode = resolveBundledNodeExecutable(isPackaged);
  if (bundledNode) {
    return { mode: 'spawn-node' as const, command: bundledNode };
  }

  if (process.env.USE_ELECTRON_NODE === 'true' || !hasSystemNode()) {
    return { mode: 'fork-electron' as const, command: process.execPath };
  }

  return { mode: 'spawn-node' as const, command: 'node' };
}

export function startBackend(isDev: boolean, isPackaged: boolean, apiPort: number) {
  const appDataDir = ensureDesktopAppDataDir();
  const backendEntry = resolveBackendEntry(isPackaged);
  const backendCwd = resolveBackendCwd(isPackaged);

  if (!fs.existsSync(backendEntry)) {
    throw new Error(`Backend entry not found: ${backendEntry}`);
  }

  const runtime = resolveBackendRuntime(isDev, isPackaged);

  const env = {
    ...process.env,
    NODE_ENV: isDev ? 'development' : 'production',
    HOST: '127.0.0.1',
    PORT: String(apiPort),
    APP_DATA_DIR: appDataDir,
    ENABLE_SWAGGER: isDev ? 'true' : 'false',
    AFIP_SERVICE_URL: process.env.AFIP_SERVICE_URL ?? 'http://127.0.0.1:5086',
    ...(runtime.mode === 'fork-electron' ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
  };

  const backendProcess =
    runtime.mode === 'spawn-node'
      ? spawn(runtime.command, [backendEntry], {
          env,
          cwd: backendCwd,
          stdio: 'pipe',
          windowsHide: true,
        })
      : fork(backendEntry, [], {
          execPath: runtime.command,
          env,
          cwd: backendCwd,
          silent: true,
        });

  attachLogs('pos-api', backendProcess);
  managedProcesses.push({ name: 'pos-api', process: backendProcess });

  return backendProcess;
}

export function startAfipSidecar(isPackaged: boolean) {
  const sidecarExecutable = resolveAfipSidecarExecutable(isPackaged);

  if (!sidecarExecutable || !fs.existsSync(sidecarExecutable)) {
    console.warn(
      '[local-services] AFIP sidecar not found. Fiscal features require AFIP at http://127.0.0.1:5086 (Docker in dev or built sidecar in prod).',
    );
    return null;
  }

  const appDataDir = ensureDesktopAppDataDir();
  const certDir = getAfipCertDir();
  fs.mkdirSync(certDir, { recursive: true });

  const sidecarProcess = spawn(sidecarExecutable, [], {
    env: {
      ...process.env,
      PRODUCTION: process.env.AFIP_PRODUCTION ?? 'FALSE',
      INSTANCE_PORT: process.env.AFIP_PORT ?? '5086',
      CERT: pathIfExists(path.join(certDir, 'user.crt'), 'user.crt'),
      PRIVATEKEY: pathIfExists(path.join(certDir, 'user.key'), 'user.key'),
      APP_DATA_DIR: appDataDir,
    },
    cwd: path.dirname(sidecarExecutable),
    stdio: 'pipe',
    windowsHide: true,
  });

  attachLogs('afip-sidecar', sidecarProcess);
  managedProcesses.push({ name: 'afip-sidecar', process: sidecarProcess });

  return sidecarProcess;
}

function pathIfExists(absolutePath: string, fallback: string) {
  return fs.existsSync(absolutePath) ? absolutePath : fallback;
}

export async function bootstrapLocalServices(options: {
  isDev: boolean;
  isPackaged: boolean;
  apiPort: number;
}) {
  const { isDev, isPackaged, apiPort } = options;

  if (shouldSpawnAfipSidecar(isPackaged)) {
    const sidecarProcess = startAfipSidecar(isPackaged);
    if (sidecarProcess) {
      await waitForUrl(getAfipHealthUrl(), 45000, false);
    }
  }

  startBackend(isDev, isPackaged, apiPort);
  await waitForUrl(getApiHealthUrl(apiPort), 30000, true);
}

export function stopLocalServices() {
  for (const managed of managedProcesses.reverse()) {
    if (!managed.process.killed) {
      managed.process.kill();
    }
  }

  managedProcesses.length = 0;
}
