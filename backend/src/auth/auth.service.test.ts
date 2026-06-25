import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { EntityManager } from 'typeorm';
import { AuthService } from './auth.service';
import type { UserEntity } from './user.entity';

type MockUsersRepository = {
  count: () => Promise<number>;
  findOne: (options: { where: { username: string } }) => Promise<UserEntity | null>;
  manager: {
    transaction: (callback: (entityManager: EntityManager) => Promise<unknown>) => Promise<unknown>;
  };
};

type MockJwtService = {
  signAsync: (payload: unknown) => Promise<string>;
  verify: <T>(token: string) => T;
};

type MockLicenseService = {
  recordFailedLogin: (ip: string) => Promise<void>;
  clearLoginAttempts: (ip: string) => void;
};

type MockCashService = {
  closeOrphanOpenSessionsForFirstSetup: (manager: EntityManager) => Promise<void>;
};

function createAuthService(options: {
  users?: UserEntity[];
  user?: UserEntity | null;
  token?: string;
  verifyPayload?: { sub: string; username: string; role: 'admin' | 'cashier' };
}) {
  const store = [...(options.users ?? (options.user ? [options.user] : []))];

  const manager = {
    count: async () => store.length,
    save: async (_entity: unknown, payload: UserEntity) => {
      const saved = { ...payload, createdAt: new Date() };
      store.push(saved);
      return saved;
    },
  } as unknown as EntityManager;

  const usersRepository: MockUsersRepository = {
    count: async () => store.length,
    findOne: async ({ where }) => store.find((user) => user.username === where.username) ?? null,
    manager: {
      transaction: async (callback) => callback(manager),
    },
  };

  const jwtService: MockJwtService = {
    signAsync: async () => options.token ?? 'signed-jwt-token',
    verify: <T>(token: string) =>
      (options.verifyPayload ?? { sub: 'user-1', username: 'admin', role: 'admin' }) as T,
  };

  const licenseService: MockLicenseService = {
    recordFailedLogin: async () => undefined,
    clearLoginAttempts: () => undefined,
  };

  const cashService: MockCashService = {
    closeOrphanOpenSessionsForFirstSetup: async () => undefined,
  };

  return {
    service: new AuthService(
      usersRepository as never,
      jwtService as never,
      licenseService as never,
      cashService as never,
    ),
    store,
  };
}

test('getSetupStatus returns needsSetup when no users exist', async () => {
  const { service } = createAuthService({});
  const status = await service.getSetupStatus();
  assert.equal(status.needsSetup, true);
});

test('getSetupStatus returns false when users exist', async () => {
  const passwordHash = await bcrypt.hash('secret-pass', 4);
  const { service } = createAuthService({
    users: [
      {
        id: 'user-admin',
        username: 'admin',
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      },
    ],
  });
  const status = await service.getSetupStatus();
  assert.equal(status.needsSetup, false);
});

test('setupAdmin succeeds when database is empty', async () => {
  const { service } = createAuthService({});
  const result = await service.setupAdmin({
    username: 'owner',
    password: 'secure-pass',
    confirmPassword: 'secure-pass',
  });

  assert.equal(typeof result.accessToken, 'string');
  assert.equal(result.user.username, 'owner');
  assert.equal(result.user.role, 'admin');
});

test('setupAdmin fails when user already exists', async () => {
  const passwordHash = await bcrypt.hash('secret-pass', 4);
  const { service } = createAuthService({
    users: [
      {
        id: 'user-admin',
        username: 'admin',
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
      },
    ],
  });

  await assert.rejects(
    () =>
      service.setupAdmin({
        username: 'other',
        password: 'secure-pass',
        confirmPassword: 'secure-pass',
      }),
    ConflictException,
  );
});

test('setupAdmin rejects mismatched passwords', async () => {
  const { service } = createAuthService({});

  await assert.rejects(
    () =>
      service.setupAdmin({
        username: 'owner',
        password: 'secure-pass',
        confirmPassword: 'different-pass',
      }),
    BadRequestException,
  );
});

test('login returns JWT for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('valid-pass', 4);
  const { service } = createAuthService({
    user: {
      id: 'user-admin',
      username: 'admin',
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
    },
    token: 'jwt-access-token',
  });

  const result = await service.login({ username: 'admin', password: 'valid-pass' });
  assert.equal(result.accessToken, 'jwt-access-token');
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.role, 'admin');
});

test('login rejects invalid password', async () => {
  const passwordHash = await bcrypt.hash('valid-pass', 4);
  const { service } = createAuthService({
    user: {
      id: 'user-admin',
      username: 'admin',
      passwordHash,
      role: 'admin',
      isActive: true,
      createdAt: new Date(),
    },
  });

  await assert.rejects(
    () => service.login({ username: 'admin', password: 'wrong-password' }),
    UnauthorizedException,
  );
});

test('login rejects inactive user', async () => {
  const passwordHash = await bcrypt.hash('valid-pass', 4);
  const { service } = createAuthService({
    user: {
      id: 'user-cashier',
      username: 'cajero',
      passwordHash,
      role: 'cashier',
      isActive: false,
      createdAt: new Date(),
    },
  });

  await assert.rejects(
    () => service.login({ username: 'cajero', password: 'valid-pass' }),
    UnauthorizedException,
  );
});

test('profile returns authenticated user', () => {
  const { service } = createAuthService({});
  const profile = service.profile({ id: 'user-1', username: 'admin', role: 'admin' });
  assert.equal(profile.username, 'admin');
  assert.equal(profile.role, 'admin');
});

test('verifyToken rejects invalid token', () => {
  const jwtService: MockJwtService = {
    signAsync: async () => 'token',
    verify: () => {
      throw new Error('invalid token');
    },
  };
  const licenseService: MockLicenseService = {
    recordFailedLogin: async () => undefined,
    clearLoginAttempts: () => undefined,
  };
  const service = new AuthService(
    { count: async () => 0, findOne: async () => null, manager: { transaction: async () => undefined } } as never,
    jwtService as never,
    licenseService as never,
  );

  assert.throws(() => service.verifyToken('bad-token'), UnauthorizedException);
});
