import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCashHistory, normalizeCatalog } from './normalize-register-data.js';

test('normalizeCatalog maps agent payload into register catalog', () => {
  const catalog = normalizeCatalog('CLI-00001', 'reg-1', {
    categories: [{ name: 'Bebidas', productCount: 2 }],
    products: [{ id: 'p1', name: 'Agua', price: 500, categories: ['Bebidas'] }],
    syncedAt: '2026-06-20T12:00:00.000Z',
  });

  assert.equal(catalog.clientNumber, 'CLI-00001');
  assert.equal(catalog.registerId, 'reg-1');
  assert.equal(catalog.products.length, 1);
  assert.equal(catalog.syncedAt, '2026-06-20T12:00:00.000Z');
});

test('normalizeCashHistory maps agent payload into register cash history', () => {
  const history = normalizeCashHistory('CLI-00001', 'reg-1', {
    currentSession: {
      id: 's1',
      startTime: '2026-06-20T09:00:00.000Z',
      initialBalance: 1000,
      totalSales: 500,
      isOpen: true,
    },
    closedSessions: [],
    syncedAt: '2026-06-20T12:00:00.000Z',
  });

  assert.equal(history.currentSession?.id, 's1');
  assert.equal(history.closedSessions.length, 0);
});
