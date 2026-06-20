import assert from 'node:assert/strict';
import test from 'node:test';
import { CommandQueue } from './command-queue.js';

test('CommandQueue enqueues and lists pending commands per register', () => {
  const queue = new CommandQueue();

  const first = queue.enqueue({
    registerId: 'reg-1',
    clientNumber: 'CLI-00001',
    action: 'increase_prices_by_category',
    payload: { category: 'Bebidas', percent: 10 },
  });

  queue.enqueue({
    registerId: 'reg-2',
    clientNumber: 'CLI-00002',
    action: 'increase_prices_by_category',
    payload: { category: 'Panadería', percent: 5 },
  });

  assert.equal(queue.listPending('reg-1').length, 1);
  assert.equal(queue.listPending('reg-1')[0]?.id, first.id);
  assert.equal(queue.listForRegister('CLI-00001', 'reg-1').length, 1);
});

test('CommandQueue marks completed and failed with retry cap', () => {
  const queue = new CommandQueue();

  const command = queue.enqueue({
    registerId: 'reg-1',
    clientNumber: 'CLI-00001',
    action: 'increase_prices_by_category',
    payload: { category: 'Lácteos', percent: 8 },
  });

  queue.markProcessing(command.id);
  assert.equal(queue.get(command.id)?.attempts, 1);

  queue.markCompleted(command.id);
  assert.equal(queue.get(command.id)?.status, 'completed');
  assert.equal(queue.listPending('reg-1').length, 0);

  const retryable = queue.enqueue({
    registerId: 'reg-1',
    clientNumber: 'CLI-00001',
    action: 'increase_prices_by_category',
    payload: { category: 'Fiambres', percent: 12 },
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    queue.markProcessing(retryable.id);
    queue.markFailed(retryable.id, 'offline');
  }

  assert.equal(queue.get(retryable.id)?.status, 'failed');
  assert.equal(queue.get(retryable.id)?.lastError, 'offline');
});
