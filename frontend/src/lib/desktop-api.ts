import type { ReceiptPrintDocument } from "./receipt-print-document";
import type { PrinterPrintOptions, SystemPrinterInfo } from "./printer-settings";

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

export function printReceiptInBrowser(html: string): void {
  const printWindow = window.open("", "_blank", "width=420,height=720");
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
      printReceipt?: (payload: ElectronPrintPayload) => Promise<void>;
      listPrinters?: () => Promise<SystemPrinterInfo[]>;
    };
  }
}
