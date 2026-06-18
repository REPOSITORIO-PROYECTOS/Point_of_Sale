export function isElectronEnvironment(): boolean {
  return typeof window !== "undefined" && typeof window.desktop?.printReceipt === "function";
}

export async function printReceiptElectron(html: string): Promise<void> {
  if (!isElectronEnvironment()) {
    throw new Error("Impresión Electron no disponible");
  }

  await window.desktop!.printReceipt!(html);
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
      printReceipt?: (html: string) => Promise<void>;
    };
  }
}
