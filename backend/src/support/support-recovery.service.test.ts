import assert from 'node:assert/strict';
import test from 'node:test';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SupportRecoveryService } from './support-recovery.service';

test('assertRecoveryEnabled throws 503 when disabled', () => {
  const previous = process.env.SUPPORT_RECOVERY_SECRET;
  delete process.env.SUPPORT_RECOVERY_SECRET;

  try {
    const service = new SupportRecoveryService({} as never, { record: () => ({}) } as never, {
      getStatus: async () => ({ status: 'missing' }),
    } as never);

    assert.throws(() => service.assertRecoveryEnabled(), ServiceUnavailableException);
  } finally {
    if (previous !== undefined) {
      process.env.SUPPORT_RECOVERY_SECRET = previous;
    }
  }
});

test('unlock rejects wrong recovery key', () => {
  const secret = 'c'.repeat(32);
  const previous = process.env.SUPPORT_RECOVERY_SECRET;
  process.env.SUPPORT_RECOVERY_SECRET = secret;

  try {
    const service = new SupportRecoveryService({} as never, { record: () => ({}) } as never, {
      getStatus: async () => ({ status: 'active' }),
    } as never);

    assert.throws(() => service.unlock('wrong-key'), UnauthorizedException);
  } finally {
    if (previous === undefined) {
      delete process.env.SUPPORT_RECOVERY_SECRET;
    } else {
      process.env.SUPPORT_RECOVERY_SECRET = previous;
    }
  }
});

test('recovery disabled when SUPPORT_RECOVERY_SECRET unset', () => {
  const service = new SupportRecoveryService({} as never, { record: () => ({}) } as never, {
    getStatus: async () => ({ status: 'missing' }),
  } as never);
  assert.equal(service.isRecoveryEnabled(), false);
});

test('recovery enabled when secret has min length', () => {
  const secret = 'a'.repeat(32);
  const previous = process.env.SUPPORT_RECOVERY_SECRET;
  process.env.SUPPORT_RECOVERY_SECRET = secret;

  try {
    const service = new SupportRecoveryService({} as never, { record: () => ({}) } as never, {
      getStatus: async () => ({ status: 'active' }),
    } as never);

    assert.equal(service.isRecoveryEnabled(), true);
    assert.equal(service.verifyRecoveryKey('wrong-key'), false);
    assert.equal(service.verifyRecoveryKey(secret), true);
  } finally {
    if (previous === undefined) {
      delete process.env.SUPPORT_RECOVERY_SECRET;
    } else {
      process.env.SUPPORT_RECOVERY_SECRET = previous;
    }
  }
});

test('unlock issues token when key is valid', () => {
  const secret = 'b'.repeat(40);
  const previous = process.env.SUPPORT_RECOVERY_SECRET;
  process.env.SUPPORT_RECOVERY_SECRET = secret;

  try {
    const auditEntries: Record<string, unknown>[] = [];
    const service = new SupportRecoveryService({} as never, {
      record: (entry: Record<string, unknown>) => {
        auditEntries.push(entry);
        return entry;
      },
    } as never, {
      getStatus: async () => ({ status: 'active' }),
    } as never);

    const result = service.unlock(secret);
    assert.equal(typeof result.recoveryToken, 'string');
    assert.ok(result.recoveryToken.length > 0);
    assert.equal(auditEntries[0]?.action, 'support.recovery.unlock');
  } finally {
    if (previous === undefined) {
      delete process.env.SUPPORT_RECOVERY_SECRET;
    } else {
      process.env.SUPPORT_RECOVERY_SECRET = previous;
    }
  }
});
