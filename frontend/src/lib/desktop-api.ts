export type ReceiptWidthMm = 55 | 80;

export type ElectronPrintPayload = {
  html: string;
  widthMm: ReceiptWidthMm;
};

export function isElectronEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.desktop?.printReceipt === "function";
}

export async function printReceiptElectron(
  html: string,
  widthMm: ReceiptWidthMm = 80,
): Promise<void> {
  if (!isElectronEnvironment()) {
    throw new Error("Impresión Electron no disponible");
  }

  await window.desktop!.printReceipt!({ html, widthMm });
}

export function printReceiptInBrowser(html: string): void {
  const printWindow = window.open("", "_blank", "width=420,height=720");
  if (!printWindow) {
    throw new Error("No se pudo abrir ventana de impresión");
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
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
    };
  }
}
