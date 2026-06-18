import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const appFolderName = 'PointOfSale';

function getDefaultAppDataDir() {
  if (process.env.APP_DATA_DIR) {
    return path.resolve(process.env.APP_DATA_DIR);
  }

  if (process.env.NODE_ENV === 'production' && process.platform === 'win32') {
    const baseDir = process.env.APPDATA ?? process.env.LOCALAPPDATA;
    if (baseDir) {
      return path.join(baseDir, appFolderName);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    return path.join(os.homedir(), `.${appFolderName.toLowerCase()}`);
  }

  return path.resolve(process.cwd(), 'storage');
}

export function getDesktopPaths() {
  const appDataDir = getDefaultAppDataDir();

  return {
    appDataDir,
    uploadsDir: path.join(appDataDir, 'uploads'),
    brandingDir: path.join(appDataDir, 'branding'),
    logsDir: path.join(appDataDir, 'logs'),
    sqliteDbPath: path.join(appDataDir, 'database.sqlite'),
  };
}

export function ensureDesktopPaths(paths: ReturnType<typeof getDesktopPaths>) {
  fs.mkdirSync(paths.appDataDir, { recursive: true });
  fs.mkdirSync(paths.uploadsDir, { recursive: true });
  fs.mkdirSync(paths.brandingDir, { recursive: true });
  fs.mkdirSync(paths.logsDir, { recursive: true });
  fs.mkdirSync(path.join(paths.appDataDir, 'afip'), { recursive: true });
}
