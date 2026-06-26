import type { BrowserWindow } from 'electron';
import { app, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { markAppQuitting } from './app-quit';
import { stopLocalServicesGracefully } from './local-services';
import {
  canRunAutoUpdater,
  getUpdaterEnvPath,
  hasUpdaterCredentials,
  isAutoUpdateDisabled,
  isPublicGitHubFeed,
  loadUpdaterConfigFromAppData,
} from './updater-config';

export type AppUpdateEvent = {
  status:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'progress'
    | 'downloaded'
    | 'installing'
    | 'error'
    | 'skipped';
  payload?: unknown;
};

export type AppUpdateCheckResponse = {
  ok: boolean;
  version?: string | null;
  message?: string;
  skipped?: boolean;
  reason?: 'disabled' | 'no_token' | 'not_packaged';
};

const BOOT_CHECK_DELAY_MS = 10_000;
const WINDOWS_FILE_RELEASE_DELAY_MS = 400;

let installInProgress = false;

const SKIP_MESSAGE =
  'Actualizaciones automáticas no configuradas. Copiá updater.env a %APPDATA%\\PointOfSale o desactivá con POS_DISABLE_AUTO_UPDATE=true.';

function sendUpdateEvent(getMainWindow: () => BrowserWindow | null, event: AppUpdateEvent) {
  const window = getMainWindow();
  window?.webContents.send('app-update', event);
}

function configurePrivateGitHubFeed() {
  const token = process.env.GH_UPDATER_TOKEN ?? process.env.GH_TOKEN;
  if (!token) {
    return;
  }

  autoUpdater.requestHeaders = {
    Authorization: `Bearer ${token}`,
  };
}

function toFriendlyErrorMessage(raw: string): string {
  if (raw.includes('404') || raw.includes('releases.atom')) {
    return 'No se encontró el release en GitHub. Verificá que exista una versión publicada y que el token tenga acceso de lectura.';
  }

  if (raw.includes('401') || raw.includes('Bad credentials') || raw.includes('authentication')) {
    return 'Token de GitHub inválido o expirado. Actualizá GH_UPDATER_TOKEN en updater.env.';
  }

  if (raw.includes('ENOTFOUND') || raw.includes('network') || raw.includes('ETIMEDOUT')) {
    return 'Sin conexión a internet. Reintentá cuando haya red disponible.';
  }

  return 'No se pudo comprobar actualizaciones. Contactá soporte o actualizá manualmente con el instalador.';
}

function registerVersionIpc() {
  ipcMain.handle('app-get-version', () => app.getVersion());
}

function registerSkippedIpc(getMainWindow: () => BrowserWindow | null, reason: AppUpdateCheckResponse['reason']) {
  ipcMain.handle('app-update-check', async (): Promise<AppUpdateCheckResponse> => {
    sendUpdateEvent(getMainWindow, {
      status: 'skipped',
      payload: { reason, message: reason === 'disabled' ? 'Actualizaciones deshabilitadas' : SKIP_MESSAGE },
    });
    return {
      ok: false,
      skipped: true,
      reason,
      message: reason === 'disabled' ? 'Actualizaciones deshabilitadas' : SKIP_MESSAGE,
    };
  });

  ipcMain.handle('app-update-install', async () => {
    // noop cuando el updater no está activo
  });
}

async function quitAndInstallUpdate(getMainWindow: () => BrowserWindow | null): Promise<void> {
  if (installInProgress) {
    return;
  }

  installInProgress = true;
  sendUpdateEvent(getMainWindow, { status: 'installing' });

  try {
    markAppQuitting();
    await stopLocalServicesGracefully();
    await new Promise((resolve) => setTimeout(resolve, WINDOWS_FILE_RELEASE_DELAY_MS));
    // NSIS oneClick: instalación silenciosa; isForceRunAfter relanza la app al terminar.
    autoUpdater.quitAndInstall(true, true);
  } catch (error) {
    installInProgress = false;
    const raw = error instanceof Error ? error.message : 'No se pudo iniciar la instalación';
    sendUpdateEvent(getMainWindow, {
      status: 'error',
      payload: { message: toFriendlyErrorMessage(raw), raw },
    });
    throw error;
  }
}

function registerActiveUpdaterIpc(getMainWindow: () => BrowserWindow | null) {
  ipcMain.handle('app-update-check', async (): Promise<AppUpdateCheckResponse> => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        ok: true,
        version: result?.updateInfo?.version ?? null,
      };
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Error al buscar actualizaciones';
      const message = toFriendlyErrorMessage(raw);
      sendUpdateEvent(getMainWindow, { status: 'error', payload: { message, raw } });
      return { ok: false, message };
    }
  });

  ipcMain.handle('app-update-install', async () => {
    await quitAndInstallUpdate(getMainWindow);
  });
}

function wireAutoUpdaterEvents(getMainWindow: () => BrowserWindow | null) {
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
    const message = toFriendlyErrorMessage(error.message);
    sendUpdateEvent(getMainWindow, {
      status: 'error',
      payload: { message, raw: error.message },
    });
  });
}

export function setupAutoUpdater(getMainWindow: () => BrowserWindow | null) {
  registerVersionIpc();

  if (!app.isPackaged) {
    registerSkippedIpc(getMainWindow, 'not_packaged');
    return;
  }

  const config = loadUpdaterConfigFromAppData();
  if (config.loaded) {
    console.info(`[auto-updater] configuración cargada desde ${config.path}`);
  } else {
    console.info(`[auto-updater] sin ${getUpdaterEnvPath()} — usando variables de entorno del sistema`);
  }

  if (isAutoUpdateDisabled()) {
    console.info('[auto-updater] deshabilitado (POS_DISABLE_AUTO_UPDATE=true)');
    registerSkippedIpc(getMainWindow, 'disabled');
    return;
  }

  if (!canRunAutoUpdater()) {
    console.warn(
      '[auto-updater] omitido: configurá POS_UPDATER_PUBLIC_REPO=true (repo público) o GH_UPDATER_TOKEN en ' +
        `${getUpdaterEnvPath()}.`,
    );
    registerSkippedIpc(getMainWindow, 'no_token');
    return;
  }

  if (hasUpdaterCredentials()) {
    configurePrivateGitHubFeed();
  } else if (isPublicGitHubFeed()) {
    console.info('[auto-updater] usando feed público de GitHub Releases (sin PAT)');
  }
  registerActiveUpdaterIpc(getMainWindow);

  autoUpdater.autoDownload = true;
  // Solo instalar cuando el usuario elige "Reiniciar e instalar" (evita NSIS en segundo plano al cerrar).
  autoUpdater.autoInstallOnAppQuit = false;
  wireAutoUpdaterEvents(getMainWindow);

  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((error: Error) => {
      console.warn('[auto-updater] check inicial falló:', toFriendlyErrorMessage(error.message));
    });
  }, BOOT_CHECK_DELAY_MS);
}
