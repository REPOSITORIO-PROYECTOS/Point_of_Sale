import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { UserEntity } from '@/auth/user.entity';
import { UsersService } from './users.service';

type MockRepository = {
  find: (options: { order: Record<string, string> }) => Promise<UserEntity[]>;
  findOne: (options: { where: { id?: string; username?: string } }) => Promise<UserEntity | null>;
  save: (entity: UserEntity) => Promise<UserEntity>;
};

function createUsersService(users: UserEntity[]) {
  const store = [...users];

  const repository: MockRepository = {
    find: async () => [...store].sort((a, b) => a.username.localeCompare(b.username)),
    findOne: async ({ where }) => {
      if (where.id) {
        return store.find((user) => user.id === where.id) ?? null;
      }
      if (where.username) {
        return store.find((user) => user.username === where.username) ?? null;
      }
      return null;
    },
    save: async (entity) => {
      const withDates = {
        ...entity,
        createdAt: entity.createdAt ?? new Date(),
      };
      const index = store.findIndex((user) => user.id === withDates.id);
      if (index >= 0) {
        store[index] = withDates;
        return withDates;
      }
      store.push(withDates);
      return withDates;
    },
  };

  return { service: new UsersService(repository as never), store };
}

const sampleUsers: UserEntity[] = [
  {
    id: 'admin-1',
    username: 'admin',
    passwordHash: 'hash',
    role: 'admin',
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  {
    id: 'cashier-1',
    username: 'cajero',
    passwordHash: 'hash',
    role: 'cashier',
    isActive: true,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  },
];

test('findAll returns users sorted by username', async () => {
  const { service } = createUsersService(sampleUsers);
  const users = await service.findAll();

  assert.equal(users.length, 2);
  assert.equal(users[0]?.username, 'admin');
  assert.equal(users[1]?.username, 'cajero');
  assert.equal(users[1]?.isActive, true);
});

test('create persists a new active user', async () => {
  const { service, store } = createUsersService(sampleUsers);
  const created = await service.create({
    username: 'nuevo',
    password: 'password-123',
    role: 'manager',
  });

  assert.equal(created.username, 'nuevo');
  assert.equal(created.role, 'manager');
  assert.equal(created.isActive, true);
  assert.equal(store.length, 3);
  assert.notEqual(store.find((user) => user.username === 'nuevo')?.passwordHash, 'password-123');
});

test('create rejects duplicate username', async () => {
  const { service } = createUsersService(sampleUsers);

  await assert.rejects(
    () =>
      service.create({
        username: 'admin',
        password: 'password-123',
        role: 'cashier',
      }),
    ConflictException,
  );
});

test('update toggles isActive for existing user', async () => {
  const { service, store } = createUsersService(sampleUsers);
  const updated = await service.update('cashier-1', { isActive: false });

  assert.equal(updated.isActive, false);
  assert.equal(store.find((user) => user.id === 'cashier-1')?.isActive, false);
});

test('update changes role and password hash', async () => {
  const { service, store } = createUsersService(sampleUsers);
  const updated = await service.update('cashier-1', {
    role: 'auditor',
    password: 'nueva-clave-123',
  });

  assert.equal(updated.role, 'auditor');
  assert.notEqual(store.find((user) => user.id === 'cashier-1')?.passwordHash, 'hash');
});

test('update blocks self deactivation', async () => {
  const { service } = createUsersService(sampleUsers);

  await assert.rejects(
    () => service.update('admin-1', { isActive: false }, 'admin-1'),
    BadRequestException,
  );
});

test('update throws NotFoundException for missing user', async () => {
  const { service } = createUsersService(sampleUsers);

  await assert.rejects(() => service.update('missing-id', { isActive: false }), NotFoundException);
});
