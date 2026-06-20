import assert from 'node:assert/strict';
import test from 'node:test';
import { CommandBridge } from './command-bridge.js';

test('CommandBridge resolves successful response', async () => {
  const bridge = new CommandBridge();
  const promise = bridge.waitForResponse('cmd-1', 1000);
  bridge.resolveResponse('cmd-1', true, { ok: true });

  const result = await promise;
  assert.deepEqual(result, { ok: true });
});

test('CommandBridge rejects failed response', async () => {
  const bridge = new CommandBridge();
  const promise = bridge.waitForResponse('cmd-2', 1000);
  bridge.resolveResponse('cmd-2', false, undefined, 'POS error');

  await assert.rejects(promise, /POS error/);
});

test('CommandBridge times out when no response arrives', async () => {
  const bridge = new CommandBridge();
  await assert.rejects(() => bridge.waitForResponse('cmd-3', 20), /timeout/);
});
