import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultSnapshot, normalizeSnapshot } from './snapshot.js';
import type { Register, RegisterSnapshot } from './types.js';

const sampleRegister: Register = {
  id: 'reg-1',
  tenantId: 'tenant-1',
  label: 'Caja 1',
  assignedPortalUserIds: [],
  online: true,
  lastSeen: '2026-06-18T10:00:00.000Z',
};

test('buildDefaultSnapshot returns zeroed metrics for offline register', () => {
  const snapshot = buildDefaultSnapshot(sampleRegister, 'CLI-00001', ['2026-06-18T10:00:00.000Z']);

  assert.equal(snapshot.registerId, 'reg-1');
  assert.equal(snapshot.clientNumber, 'CLI-00001');
  assert.equal(snapshot.cashSession.open, false);
  assert.deepEqual(snapshot.salesToday, { count: 0, total: 0 });
  assert.equal(snapshot.stockAlerts, 0);
  assert.deepEqual(snapshot.heartbeatHistory, ['2026-06-18T10:00:00.000Z']);
});

test('normalizeSnapshot maps legacy flat fields into enriched snapshot', () => {
  const legacy = {
    registerId: 'reg-1',
    clientNumber: 'CLI-00001',
    label: 'Caja 1',
    salesToday: 99_000,
    ticketCount: 12,
    cashSessionOpen: true,
    lastSync: '2026-06-18T11:00:00.000Z',
    currency: 'ARS',
  } as unknown as RegisterSnapshot;

  const normalized = normalizeSnapshot(legacy, sampleRegister);

  assert.deepEqual(normalized.salesToday, { count: 12, total: 99_000 });
  assert.deepEqual(normalized.cashSession, { open: true });
  assert.equal(normalized.lastSyncAt, '2026-06-18T11:00:00.000Z');
});
