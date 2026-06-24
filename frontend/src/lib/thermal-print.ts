import type { ReceiptWidthMm } from "./receipt-template";

/** Ancho de rollo térmico en micrones (1 mm = 1000 µm). 58 mm es lo habitual para papel “55”. */
export const THERMAL_PAGE_WIDTH_MICRONS: Record<ReceiptWidthMm, number> = {
  55: 58_000,
  80: 80_000,
};

/** Alto generoso para rollo continuo (300 mm). */
export const THERMAL_PAGE_HEIGHT_MICRONS = 300_000;

export function thermalPrintableWidthMm(widthMm: ReceiptWidthMm): string {
  return widthMm === 55 ? "54mm" : "72mm";
}

/** Ancho de ventana de vista previa / impresión HTML (~96 dpi). */
export function thermalPreviewWindowWidth(widthMm: ReceiptWidthMm): number {
  return widthMm === 55 ? 240 : 320;
}

export function cssPixelsToMicrons(px: number): number {
  return Math.ceil(px * (25.4 / 96) * 1000);
}

/** Solo URLs que cargan en ventana oculta / data: URL de impresión. */
export function sanitizePrintableImageUrl(url?: string | null): string | undefined {
  if (!url?.trim()) {
    return undefined;
  }

  const normalized = url.trim();
  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("file://")
  ) {
    return normalized;
  }

  return undefined;
}
