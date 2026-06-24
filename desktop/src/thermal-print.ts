export type ReceiptWidthMm = 55 | 80;

export const THERMAL_PAGE_WIDTH_MICRONS: Record<ReceiptWidthMm, number> = {
  55: 58_000,
  80: 80_000,
};

export const THERMAL_PAGE_HEIGHT_MICRONS = 300_000;

export function thermalBrowserWindowWidth(widthMm: ReceiptWidthMm): number {
  return widthMm === 55 ? 240 : 320;
}

export function cssPixelsToMicrons(px: number): number {
  return Math.ceil(px * (25.4 / 96) * 1000);
}
