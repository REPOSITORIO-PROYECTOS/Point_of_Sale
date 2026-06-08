import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const appFolderName = 'PointOfSale';

export function getDesktopAppDataDir() {
  if (process.env.APP_DATA_DIR) {
    return path.resolve(process.env.APP_DATA_DIR);
  }

  if (process.platform === 'win32') {
    const baseDir = process.env.APPDATA ?? process.env.LOCALAPPDATA;
    if (baseDir) {
      return path.join(baseDir, appFolderName);
    }
  }

  return path.join(os.homedir(), `.${appFolderName.toLowerCase()}`);
}

export function ensureDesktopAppDataDir() {
  const appDataDir = getDesktopAppDataDir();
  fs.mkdirSync(appDataDir, { recursive: true });
  fs.mkdirSync(path.join(appDataDir, 'uploads'), { recursive: true });
  fs.mkdirSync(path.join(appDataDir, 'logs'), { recursive: true });
  return appDataDir;
}

export function resolveBackendEntry(isPackaged: boolean) {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'dist', 'main.js');
  }

  return path.resolve(__dirname, '../../backend/dist/main.js');
}

export function resolveBackendCwd(isPackaged: boolean) {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }

  return path.resolve(__dirname, '../../backend');
}

export function resolveFrontendUrl(isDev: boolean, isPackaged: boolean) {
  if (isDev) {
    return process.env.ELECTRON_RENDERER_URL ?? 'http://localhost:5173';
  }

  if (isPackaged) {
    return `file://${path.join(process.resourcesPath, 'frontend', 'index.html').replace(/\\/g, '/')}`;
  }

  return `file://${path.resolve(__dirname, '../../frontend/dist/index.html').replace(/\\/g, '/')}`;
}

export function getApiHealthUrl(port = Number(process.env.PORT ?? 3001)) {
  return `http://127.0.0.1:${port}/api`;
}

export function getAfipPort() {
  return Number(process.env.AFIP_PORT ?? 5086);
}

export function getAfipHealthUrl(port = getAfipPort()) {
  return `http://127.0.0.1:${port}/api/afipws/test`;
}

export function getAfipCertDir() {
  return path.join(getDesktopAppDataDir(), 'afip');
}

export function resolveBundledNodeExecutable(isPackaged: boolean) {
  if (!isPackaged) {
    return null;
  }

  const bundledNode = path.join(process.resourcesPath, 'nodejs', 'node.exe');
  return fs.existsSync(bundledNode) ? bundledNode : null;
}

export function resolveAfipSidecarExecutable(isPackaged: boolean) {
  if (process.env.AFIP_SIDECAR_PATH) {
    return path.resolve(process.env.AFIP_SIDECAR_PATH);
  }

  if (isPackaged) {
    return path.join(process.resourcesPath, 'afip', 'afip-service.exe');
  }

  const devSidecar = path.resolve(__dirname, '../../services/afip/dist/afip-service.exe');
  if (fs.existsSync(devSidecar)) {
    return devSidecar;
  }

  return null;
}
