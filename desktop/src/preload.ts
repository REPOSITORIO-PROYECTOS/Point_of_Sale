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

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
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
      printReceipt?: (payload: ElectronPrintPayload) => Promise<void>;
      listPrinters?: () => Promise<Array<{ name: string; isDefault: boolean; status?: number }>>;
    };
  }
}

export {};
