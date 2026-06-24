import type { ReceiptPrintDocument } from "./receipt-print-document";
import type { PrinterPrintOptions, SystemPrinterInfo } from "./printer-settings";
import { thermalPreviewWindowWidth } from "./thermal-print";

export type ReceiptWidthMm = 55 | 80;

export type ElectronPrintPayload = {
  widthMm: ReceiptWidthMm;
  document?: ReceiptPrintDocument;
  html?: string;
  printer?: PrinterPrintOptions;
};

export function isElectronEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.desktop?.printReceipt === "function";
}

export type AppUpdateEvent = {
  status: "checking" | "available" | "not-available" | "progress" | "downloaded" | "error";
  payload?: unknown;
};

export type AppUpdateCheckResult = {
  ok: boolean;
  version?: string | null;
  message?: string;
};

export async function printReceiptElectron(payload: ElectronPrintPayload): Promise<void> {
  if (!isElectronEnvironment()) {
    throw new Error("Impresión Electron no disponible");
  }

  await window.desktop!.printReceipt!(payload);
}

export async function listSystemPrinters(): Promise<SystemPrinterInfo[]> {
  if (!isElectronEnvironment() || !window.desktop?.listPrinters) {
    return [];
  }

  return window.desktop.listPrinters();
}

export function printReceiptInBrowser(html: string, widthMm: ReceiptWidthMm = 80): void {
  const windowWidth = thermalPreviewWindowWidth(widthMm);
  const printWindow = window.open("", "_blank", `width=${windowWidth},height=720`);
  if (!printWindow) {
    throw new Error("No se pudo abrir ventana de impresión");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const closeAfterPrint = () => {
    printWindow.close();
  };

  printWindow.onload = () => {
    printWindow.resizeTo(windowWidth, Math.min(printWindow.document.documentElement.scrollHeight + 48, 900));
    printWindow.focus();
    if ("onafterprint" in printWindow) {
      printWindow.onafterprint = closeAfterPrint;
    }
    printWindow.print();
    window.setTimeout(closeAfterPrint, 2_000);
  };
}

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
      listPrinters?: () => Promise<SystemPrinterInfo[]>;
    };
  }
}
