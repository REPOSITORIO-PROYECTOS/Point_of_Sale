import assert from 'node:assert/strict';
import test from 'node:test';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import type { UserEntity } from './user.entity';

type MockUsersRepository = {
  findOne: (options: { where: { username: string } }) => Promise<UserEntity | null>;
};

type MockJwtService = {
  signAsync: (payload: unknown) => Promise<string>;
  verify: <T>(token: string) => T;
};

function createAuthService(options: {
  user?: UserEntity | null;
  token?: string;
  verifyPayload?: { sub: string; username: string; role: 'admin' | 'cashier' };
}) {
  const usersRepository: MockUsersRepository = {
    findOne: async () => options.user ?? null,
  };

  const jwtService: MockJwtService = {
    signAsync: async () => options.token ?? 'signed-jwt-token',
    verify: () => options.verifyPayload ?? { sub: 'user-1', username: 'admin', role: 'admin' },
  };

  return new AuthService(usersRepository as never, jwtService as never);
}

test('login returns JWT for valid credentials', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  const service = createAuthService({
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

  const result = await service.login({ username: 'admin', password: 'admin123' });
  assert.equal(result.accessToken, 'jwt-access-token');
  assert.equal(result.user.username, 'admin');
  assert.equal(result.user.role, 'admin');
});

test('login rejects invalid password', async () => {
  const passwordHash = await bcrypt.hash('admin123', 4);
  const service = createAuthService({
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
  const passwordHash = await bcrypt.hash('admin123', 4);
  const service = createAuthService({
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
    () => service.login({ username: 'cajero', password: 'admin123' }),
    UnauthorizedException,
  );
});

test('profile returns authenticated user', () => {
  const service = createAuthService({});
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
  const service = new AuthService({ findOne: async () => null } as never, jwtService as never);

  assert.throws(() => service.verifyToken('bad-token'), UnauthorizedException);
});
