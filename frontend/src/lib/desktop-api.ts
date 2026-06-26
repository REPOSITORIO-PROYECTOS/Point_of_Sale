import type { ReceiptPrintDocument } from "./receipt-print-document";
import type { PrinterPrintOptions, SystemPrinterInfo } from "./printer-settings";
import { thermalPreviewWindowWidth } from "./thermal-print";
import type { ReceiptPreviewState } from "./receipt-preview-types";

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
  status:
    | "checking"
    | "available"
    | "not-available"
    | "progress"
    | "downloaded"
    | "error"
    | "skipped";
  payload?: unknown;
};

export type AppUpdateCheckResult = {
  ok: boolean;
  version?: string | null;
  message?: string;
  skipped?: boolean;
  reason?: "disabled" | "no_token" | "not_packaged";
};

export async function printReceiptElectron(payload: ElectronPrintPayload): Promise<void> {
  if (!isElectronEnvironment()) {
    throw new Error("Impresión Electron no disponible");
  }

  await window.desktop!.printReceipt!(payload);
}

export async function generateReceiptPdf(html: string, widthMm: ReceiptWidthMm): Promise<Blob> {
  if (!isElectronEnvironment() || !window.desktop?.generateReceiptPdf) {
    throw new Error("Generación de PDF solo disponible en la app de escritorio");
  }

  const bytes = await window.desktop.generateReceiptPdf({ html, widthMm });
  return new Blob([bytes], { type: "application/pdf" });
}

export async function listSystemPrinters(): Promise<SystemPrinterInfo[]> {
  if (!isElectronEnvironment() || !window.desktop?.listPrinters) {
    return [];
  }

  return window.desktop.listPrinters();
}

export function printReceiptInBrowser(
  html: string,
  widthMm: ReceiptWidthMm = 80,
  previewFallback?: ReceiptPreviewState,
): void {
  const windowWidth = thermalPreviewWindowWidth(widthMm);
  const printWindow = window.open("", "_blank", `width=${windowWidth},height=720`);

  if (!printWindow) {
    if (previewFallback) {
      window.dispatchEvent(
        new CustomEvent("pos:open-receipt-preview", { detail: previewFallback }),
      );
      return;
    }
    throw new Error("No se pudo abrir ventana de impresión. Permití ventanas emergentes o usá la vista previa.");
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
      generateReceiptPdf?: (payload: { html: string; widthMm: ReceiptWidthMm }) => Promise<Uint8Array>;
      listPrinters?: () => Promise<SystemPrinterInfo[]>;
    };
  }
}
