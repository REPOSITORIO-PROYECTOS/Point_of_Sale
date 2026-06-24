import assert from 'node:assert/strict';
import test from 'node:test';
import {
  sanitizePrintableImageUrl,
  THERMAL_PAGE_WIDTH_MICRONS,
  thermalPrintableWidthMm,
} from '../../frontend/src/lib/thermal-print';

test('thermal page width microns match 58/80 mm rolls', () => {
  assert.equal(THERMAL_PAGE_WIDTH_MICRONS[55], 58_000);
  assert.equal(THERMAL_PAGE_WIDTH_MICRONS[80], 80_000);
});

test('thermalPrintableWidthMm leaves safe margins', () => {
  assert.equal(thermalPrintableWidthMm(55), '54mm');
  assert.equal(thermalPrintableWidthMm(80), '72mm');
});

test('sanitizePrintableImageUrl rejects relative paths', () => {
  assert.equal(sanitizePrintableImageUrl('/branding/logo.png'), undefined);
  assert.equal(sanitizePrintableImageUrl('http://127.0.0.1:5173/logo.png'), 'http://127.0.0.1:5173/logo.png');
  assert.equal(sanitizePrintableImageUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
});
