import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReceiptCss, buildReceiptHtml } from '../../frontend/src/lib/receipt-template';

test('buildReceiptCss uses 55mm page width when requested', () => {
  const css = buildReceiptCss(55);
  assert.match(css, /size:\s*55mm auto/);
  assert.match(css, /width:\s*48mm/);
});

test('buildReceiptCss uses 80mm page width when requested', () => {
  const css = buildReceiptCss(80);
  assert.match(css, /size:\s*80mm auto/);
  assert.match(css, /width:\s*72mm/);
});

test('buildReceiptHtml includes item lines and total', () => {
  const html = buildReceiptHtml(
    [{ name: 'Café', quantity: 2, price: 3.5 }],
    7,
    { widthMm: 80, businessName: 'Cafetería Demo' },
  );

  assert.match(html, /Café/);
  assert.match(html, /Total: \$7\.00/);
  assert.match(html, /Cafetería Demo/);
  assert.match(html, /size:\s*80mm auto/);
});
