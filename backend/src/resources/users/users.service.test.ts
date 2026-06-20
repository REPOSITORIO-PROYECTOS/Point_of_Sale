import assert from 'node:assert/strict';
import test from 'node:test';
import { NotFoundException, ConflictException } from '@nestjs/common';
import type { UserEntity } from '@/auth/user.entity';
import { UsersService } from './users.service';

type MockRepository = {
  find: (options: { order: Record<string, string> }) => Promise<UserEntity[]>;
  findOne: (options: { where: { id?: string; username?: string } }) => Promise<UserEntity | null>;
  create: (payload: Partial<UserEntity>) => UserEntity;
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
    create: (payload) =>
      ({
        ...payload,
        createdAt: payload.createdAt ?? new Date('2026-03-01T00:00:00.000Z'),
      }) as UserEntity,
    save: async (entity) => {
      const index = store.findIndex((user) => user.id === entity.id);
      if (index >= 0) {
        store[index] = entity;
        return entity;
      }
      store.push(entity);
      return entity;
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

test('update toggles isActive for existing user', async () => {
  const { service, store } = createUsersService(sampleUsers);
  const updated = await service.update('cashier-1', { isActive: false });

  assert.equal(updated.isActive, false);
  assert.equal(store.find((user) => user.id === 'cashier-1')?.isActive, false);
});

test('update throws NotFoundException for missing user', async () => {
  const { service } = createUsersService(sampleUsers);

  await assert.rejects(() => service.update('missing-id', { isActive: false }), NotFoundException);
});

test('create adds a new active user', async () => {
  const { service, store } = createUsersService(sampleUsers);
  const created = await service.create({
    username: 'cajero2',
    password: 'secret123',
    role: 'cashier',
  });

  assert.equal(created.username, 'cajero2');
  assert.equal(created.role, 'cashier');
  assert.equal(created.isActive, true);
  assert.equal(store.length, 3);
});

test('create throws ConflictException for duplicate username', async () => {
  const { service } = createUsersService(sampleUsers);

  await assert.rejects(
    () =>
      service.create({
        username: 'admin',
        password: 'secret123',
        role: 'cashier',
      }),
    ConflictException,
  );
});
