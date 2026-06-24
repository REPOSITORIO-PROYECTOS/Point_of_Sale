import { PosAPI } from "./pos-api";
import {
  clearPrinterSettingsCache,
  DEFAULT_PRINTER_SETTINGS,
  getCachedPrinterSettings,
  setPrinterSettingsCache,
  type PrinterSettings,
} from "./printer-settings";

export async function loadPrinterSettings(): Promise<PrinterSettings> {
  try {
    const settings = await PosAPI.getPrinterSettings();
    setPrinterSettingsCache(settings);
    return settings;
  } catch (error) {
    console.error("Error loading printer settings:", error);
    return getCachedPrinterSettings();
  }
}

export async function savePrinterSettings(
  patch: Partial<PrinterSettings>,
): Promise<PrinterSettings> {
  const current = getCachedPrinterSettings();
  const next = { ...current, ...patch };
  const saved = await PosAPI.savePrinterSettings(next);
  setPrinterSettingsCache(saved);
  return saved;
}

export function resetPrinterSettingsCache() {
  clearPrinterSettingsCache();
}

export { DEFAULT_PRINTER_SETTINGS, getCachedPrinterSettings, type PrinterSettings };
