import type { BrowserWindow } from 'electron';
import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';

export type AppUpdateEvent = {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'progress'
    | 'downloaded'
    | 'error';
  payload?: unknown;
};

const BOOT_CHECK_DELAY_MS = 30_000;

function sendUpdateEvent(getMainWindow: () => BrowserWindow | null, event: AppUpdateEvent) {
  const window = getMainWindow();
  window?.webContents.send('app-update', event);
}

function hasUpdaterCredentials(): boolean {
  return Boolean(process.env.GH_UPDATER_TOKEN ?? process.env.GH_TOKEN);
}

function configurePrivateGitHubFeed() {
  const token = process.env.GH_UPDATER_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    return;
  }

  autoUpdater.requestHeaders = {
    Authorization: `token ${token}`,
  };
}

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  if (!app.isPackaged) {
    return;
  }

  if (process.env.POS_DISABLE_AUTO_UPDATE === 'true') {
    console.info('[auto-updater] deshabilitado (POS_DISABLE_AUTO_UPDATE=true)');
    return;
  }

  // Repo GitHub privado: sin token en runtime GitHub responde 404 en releases.atom.
  if (!hasUpdaterCredentials()) {
    console.warn(
      '[auto-updater] omitido: el feed de GitHub Releases es privado y no hay GH_UPDATER_TOKEN. ' +
        'Publicá con npm run publish:win o configurá token en la caja / POS_DISABLE_AUTO_UPDATE=true.',
    );
    return;
  }

  configurePrivateGitHubFeed();

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    sendUpdateEvent(getMainWindow, { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    sendUpdateEvent(getMainWindow, { status: 'available', payload: info });
  });

  autoUpdater.on('update-not-available', (info) => {
    sendUpdateEvent(getMainWindow, { status: 'not-available', payload: info });
  });

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateEvent(getMainWindow, { status: 'progress', payload: progress });
  });

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateEvent(getMainWindow, { status: 'downloaded', payload: info });
  });

  autoUpdater.on('error', (error) => {
    sendUpdateEvent(getMainWindow, {
      status: 'error',
      payload: { message: error.message },
    });
  });

  ipcMain.handle('app-get-version', () => app.getVersion());

  ipcMain.handle('app-update-check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        version: result?.updateInfo?.version ?? null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al buscar actualizaciones';
      sendUpdateEvent(getMainWindow, { status: 'error', payload: { message } });
      return { ok: false, message };
    }
  });

  ipcMain.handle('app-update-install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error: Error) => {
      console.warn('[auto-updater] check inicial falló:', error.message);
    });
  }, BOOT_CHECK_DELAY_MS);
}
