import assert from 'node:assert/strict';
import test from 'node:test';
import { CommandQueue } from './store/command-queue.js';

test('deferred price increase stays pending until register reconnect flow completes', () => {
  const queue = new CommandQueue();

  const queued = queue.enqueue({
    registerId: 'reg-pos-1',
    clientNumber: 'CLI-00001',
    action: 'increase_prices_by_category',
    payload: { category: 'Bebidas', percent: 15 },
  });

  assert.equal(queued.status, 'pending');
  assert.deepEqual(queued.payload, { category: 'Bebidas', percent: 15 });

  const pendingBeforeReconnect = queue.listPending('reg-pos-1');
  assert.equal(pendingBeforeReconnect.length, 1);

  queue.markProcessing(queued.id);
  queue.markCompleted(queued.id);

  assert.equal(queue.listPending('reg-pos-1').length, 0);
  assert.equal(queue.get(queued.id)?.status, 'completed');
});

test('register pending list excludes completed commands', () => {
  const queue = new CommandQueue();

  const queued = queue.enqueue({
    registerId: 'reg-pos-2',
    clientNumber: 'CLI-00002',
    action: 'increase_prices_by_category',
    payload: { category: 'Golosinas', percent: 20 },
  });

  assert.equal(queue.listForRegister('CLI-00002', 'reg-pos-2').length, 1);

  queue.markProcessing(queued.id);
  queue.markCompleted(queued.id);

  assert.equal(queue.listForRegister('CLI-00002', 'reg-pos-2').length, 0);
});
