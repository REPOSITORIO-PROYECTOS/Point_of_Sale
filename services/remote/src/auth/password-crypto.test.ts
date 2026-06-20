import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPortalPassword, verifyPortalPassword } from './password-crypto.js';

test('hashPortalPassword produces verifiable bcrypt hash', async () => {
  const hash = await hashPortalPassword('demo1234');
  assert.ok(hash.startsWith('$2'));
  assert.equal(await verifyPortalPassword('demo1234', hash), true);
  assert.equal(await verifyPortalPassword('wrong', hash), false);
});

test('verifyPortalPassword rejects missing hash', async () => {
  assert.equal(await verifyPortalPassword('demo1234', undefined), false);
});
