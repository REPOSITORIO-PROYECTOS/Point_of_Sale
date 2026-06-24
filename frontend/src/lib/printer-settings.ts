export type PrinterType = 'epson' | 'star' | 'tanca' | 'daruma' | 'brother' | 'custom';

export type PrinterSettings = {
  printerName?: string | null;
  printMode: 'escpos' | 'html';
  printSilent: boolean;
  printerType: PrinterType;
  fallbackHtml: boolean;
};

export type PrinterPrintOptions = {
  printerName?: string | null;
  printMode?: 'escpos' | 'html';
  printSilent?: boolean;
  printerType?: PrinterType;
  fallbackHtml?: boolean;
};

export type SystemPrinterInfo = {
  name: string;
  isDefault: boolean;
  status?: number;
};

export const DEFAULT_PRINTER_SETTINGS: PrinterSettings = {
  printerName: null,
  printMode: 'escpos',
  printSilent: false,
  printerType: 'epson',
  fallbackHtml: true,
};

let cachedSettings: PrinterSettings | null = null;

export function setPrinterSettingsCache(settings: PrinterSettings) {
  cachedSettings = settings;
}

export function clearPrinterSettingsCache() {
  cachedSettings = null;
}

export function getCachedPrinterSettings(): PrinterSettings {
  return cachedSettings ?? DEFAULT_PRINTER_SETTINGS;
}

export function toPrinterPrintOptions(settings: PrinterSettings): PrinterPrintOptions {
  return {
    printerName: settings.printerName,
    printMode: settings.printMode,
    printSilent: settings.printSilent,
    printerType: settings.printerType,
    fallbackHtml: settings.fallbackHtml,
  };
}
