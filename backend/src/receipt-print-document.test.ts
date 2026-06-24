import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReceiptPrintDocument,
  escposColumnsForWidth,
  renderReceiptPrintText,
} from "../../frontend/src/lib/receipt-print-document";

test("escposColumnsForWidth usa 32/48 columnas según rollo", () => {
  assert.equal(escposColumnsForWidth(55), 32);
  assert.equal(escposColumnsForWidth(80), 48);
});

test("buildReceiptPrintDocument serializa ítems y totales", () => {
  const doc = buildReceiptPrintDocument({
    widthMm: 80,
    voucherType: "comprobante",
    businessName: "Kiosco Test",
    items: [{ name: "Agua", quantity: 2, price: 150 }],
    total: 300,
    ticketId: "abc-123",
  });

  assert.equal(doc.emisor.razonSocial, "Kiosco Test");
  assert.equal(doc.items.length, 1);
  assert.equal(doc.items[0].lineTotal, 300);
  assert.equal(doc.total, 300);
  assert.equal(doc.widthMm, 80);
});

test("buildReceiptPrintDocument incluye movimiento de caja", () => {
  const doc = buildReceiptPrintDocument({
    voucherType: "movimiento_egreso",
    items: [],
    total: 500,
    movement: {
      concepto: "Retiro",
      metodoPagoLabel: "Efectivo",
      operador: "Ana",
      idMovimiento: 9,
      idSesion: 2,
    },
  });

  assert.equal(doc.voucherType, "movimiento_egreso");
  assert.equal(doc.movement?.concepto, "Retiro");
  assert.equal(doc.total, 500);
});

test("renderReceiptPrintText replica estructura ESC/POS en texto plano", () => {
  const doc = buildReceiptPrintDocument({
    widthMm: 80,
    voucherType: "comprobante",
    businessName: "Kiosco Test",
    items: [{ name: "Agua", quantity: 2, price: 150 }],
    total: 300,
    subtotal: 300,
    ticketId: "abc-12345678",
    payments: [{ type: "cash", amount: 300, label: "Efectivo" }],
  });

  const text = renderReceiptPrintText(doc);
  assert.match(text, /KIOSCO TEST/);
  assert.match(text, /RECIBO DE PAGO/);
  assert.match(text, /Agua/);
  assert.match(text, /\$300\.00/);
  assert.match(text, /Efectivo/);
  assert.match(text, /COMPROBANTE NO VALIDO COMO FACTURA/);
  assert.equal(text.split("\n").length >= 8, true);
});
