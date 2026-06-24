import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReceiptHtml } from '../../frontend/src/lib/receipt-template';

test('buildReceiptHtml comprobante uses recibo layout', () => {
  const html = buildReceiptHtml(
    [{ name: 'Café', quantity: 2, price: 3.5 }],
    7,
    { widthMm: 80, businessName: 'Cafetería Demo', voucherType: 'comprobante' },
  );

  assert.match(html, /RECIBO DE PAGO/);
  assert.match(html, /Café/);
  assert.match(html, /TOTAL A PAGAR: \$7\.00/);
  assert.match(html, /COMPROBANTE NO VÁLIDO COMO FACTURA/);
  assert.match(html, /Courier New/);
});

test('buildReceiptHtml factura includes fiscal blocks', () => {
  const html = buildReceiptHtml(
    [{ name: 'Café', quantity: 2, price: 3.5 }],
    7,
    {
      widthMm: 80,
      businessName: 'Cafetería Demo',
      voucherType: 'factura',
      afip: { tipoAfip: 6, neto: 5.79, iva: 1.21, cae: '12345678901234' },
      mostrarDesgloseIva: true,
    },
  );

  assert.match(html, /FACTURA/);
  assert.match(html, /Neto Gravado/);
  assert.match(html, /CAE N°: 12345678901234/);
  assert.match(html, /Defensa del Consumidor/);
});

test('buildReceiptHtml presupuesto includes terms', () => {
  const html = buildReceiptHtml(
    [{ name: 'Café', quantity: 1, price: 3.5 }],
    3.5,
    { widthMm: 80, businessName: 'Cafetería Demo', voucherType: 'presupuesto' },
  );

  assert.match(html, /PRESUPUESTO/);
  assert.match(html, /Validez: 15 días/);
  assert.match(html, /no incluye IVA/);
});
