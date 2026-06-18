import { contextBridge, ipcRenderer } from 'electron';

export type ReceiptWidthMm = 55 | 80;

export type ElectronPrintPayload = {
  html: string;
  widthMm: ReceiptWidthMm;
};

contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  // HTML thermal print via OS driver (ESC/POS direct driver: future sprint).
  printReceipt: (payload: ElectronPrintPayload) => ipcRenderer.invoke('print-receipt', payload),
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
    };
  }
}

export {};
