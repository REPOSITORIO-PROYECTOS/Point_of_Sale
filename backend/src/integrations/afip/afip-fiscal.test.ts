import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAfipFacturaPayload,
  computeIvaBreakdown,
  DEFAULT_AFIP_BILLING_DEFAULTS,
  normalizeAfipBillingDefaults,
  resolveCheckoutBuyer,
  resolveTipoAfipForBuyer,
  validateCustomBuyer,
} from './afip-fiscal';

test('normalizeAfipBillingDefaults falls back to consumidor final', () => {
  const defaults = normalizeAfipBillingDefaults({ tipoAfip: 11 });

  assert.equal(defaults.tipoAfip, 11);
  assert.equal(defaults.tipoDocumento, 99);
  assert.equal(defaults.documento, '0');
  assert.equal(defaults.idCondicionIva, 5);
  assert.equal(defaults.ivaRatePercent, 21);
});

test('computeIvaBreakdown splits total with IVA included', () => {
  const { neto, iva } = computeIvaBreakdown(121, 21);

  assert.equal(neto, 100);
  assert.equal(iva, 21);
});

test('resolveCheckoutBuyer uses defaults for consumidor final', () => {
  const buyer = resolveCheckoutBuyer('consumidor_final', DEFAULT_AFIP_BILLING_DEFAULTS);

  assert.equal(buyer.mode, 'consumidor_final');
  assert.equal(buyer.tipoDocumento, 99);
  assert.equal(buyer.documento, '0');
  assert.equal(buyer.idCondicionIva, 5);
  assert.equal(buyer.tipoAfip, 6);
});

test('resolveTipoAfipForBuyer switches to Factura A for responsable inscripto', () => {
  assert.equal(resolveTipoAfipForBuyer(1, 6), 1);
  assert.equal(resolveTipoAfipForBuyer(5, 6), 6);
});

test('buildAfipFacturaPayload includes neto and iva', () => {
  const buyer = resolveCheckoutBuyer('consumidor_final', DEFAULT_AFIP_BILLING_DEFAULTS);
  const payload = buildAfipFacturaPayload(121, buyer, DEFAULT_AFIP_BILLING_DEFAULTS);

  assert.equal(payload.tipo_afip, 6);
  assert.equal(payload.tipo_documento, 99);
  assert.equal(payload.documento, '0');
  assert.equal(payload.id_condicion_iva, 5);
  assert.equal(payload.total, 121);
  assert.equal(payload.neto, 100);
  assert.equal(payload.iva, 21);
});

test('validateCustomBuyer requires CUIT with 11 digits', () => {
  assert.equal(
    validateCustomBuyer({ tipoDocumento: 80, documento: '2012345678', idCondicionIva: 1 }),
    'El CUIT debe tener 11 dígitos',
  );
  assert.equal(
    validateCustomBuyer({ tipoDocumento: 80, documento: '20123456789', idCondicionIva: 1 }),
    null,
  );
});

test('buildAfipFacturaPayload strips non-digits from custom document', () => {
  const buyer = resolveCheckoutBuyer('custom', DEFAULT_AFIP_BILLING_DEFAULTS, {
    tipoDocumento: 80,
    documento: '20-12345678-9',
    idCondicionIva: 1,
    tipoAfip: 1,
  });
  const payload = buildAfipFacturaPayload(500, buyer, DEFAULT_AFIP_BILLING_DEFAULTS);

  assert.equal(payload.documento, '20123456789');
  assert.equal(payload.tipo_afip, 1);
});
