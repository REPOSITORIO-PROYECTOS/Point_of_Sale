import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRegisterSnapshot, mapLicenseStatus } from './remote-snapshot.builder.js';

test('buildRegisterSnapshot assembles enriched payload', () => {
  const snapshot = buildRegisterSnapshot({
    registerId: 'reg-abc',
    clientNumber: 'CLI-00042',
    label: 'Caja Principal',
    cashSession: {
      open: true,
      openedAt: '2026-06-18T08:00:00.000Z',
      openingBalance: 5000,
      salesTotal: 12_000,
      expectedBalance: 17_000,
    },
    salesToday: { count: 8, total: 12_000 },
    stockAlerts: 2,
    licenseStatus: 'active',
    agentVersion: '0.0.1',
  });

  assert.equal(snapshot.registerId, 'reg-abc');
  assert.equal(snapshot.currency, 'ARS');
  assert.deepEqual(snapshot.salesToday, { count: 8, total: 12_000 });
  assert.equal(snapshot.cashSession.expectedBalance, 17_000);
});

test('mapLicenseStatus maps grace and invalid states', () => {
  assert.equal(mapLicenseStatus('active', false), 'active');
  assert.equal(mapLicenseStatus('expired', true), 'grace');
  assert.equal(mapLicenseStatus('missing', false), 'invalid');
});
