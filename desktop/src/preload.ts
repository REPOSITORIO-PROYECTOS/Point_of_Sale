import { contextBridge, ipcRenderer } from 'electron';

export type ReceiptWidthMm = 55 | 80;

export type ElectronPrintPayload = {
  widthMm: ReceiptWidthMm;
  /** Documento texto/ESC/POS (preferido en desktop). */
  document?: Record<string, unknown>;
  /** HTML de respaldo si ESC/POS falla o POS_PRINT_MODE=html. */
  html?: string;
  printer?: Record<string, unknown>;
};

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

type AppUpdateCheckResult = {
  ok: boolean;
  version?: string | null;
  message?: string;
};

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  getAppVersion: () => ipcRenderer.invoke('app-get-version') as Promise<string>,
  checkForUpdates: () => ipcRenderer.invoke('app-update-check') as Promise<AppUpdateCheckResult>,
  installUpdate: () => ipcRenderer.invoke('app-update-install') as Promise<void>,
  onUpdateStatus: (callback: (event: AppUpdateEvent) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: AppUpdateEvent) => {
      callback(data);
    };
    ipcRenderer.on('app-update', listener);
    return () => {
      ipcRenderer.removeListener('app-update', listener);
    };
  },
  printReceipt: (payload: ElectronPrintPayload) => ipcRenderer.invoke('print-receipt', payload),
  listPrinters: () => ipcRenderer.invoke('list-printers'),
});

declare global {
  interface Window {
    desktop?: {
      platform: string;
      versions: {
        node: string;
        chrome: string;
        electron: string;
      };
      getAppVersion?: () => Promise<string>;
      checkForUpdates?: () => Promise<AppUpdateCheckResult>;
      installUpdate?: () => Promise<void>;
      onUpdateStatus?: (callback: (event: AppUpdateEvent) => void) => () => void;
      printReceipt?: (payload: ElectronPrintPayload) => Promise<void>;
      listPrinters?: () => Promise<Array<{ name: string; isDefault: boolean; status?: number }>>;
    };
  }
}

export {};
