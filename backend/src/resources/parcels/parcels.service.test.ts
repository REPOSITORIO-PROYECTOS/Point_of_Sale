import assert from 'node:assert/strict';
import test from 'node:test';
import { ConflictException, NotFoundException } from '@nestjs/common';
import type { ParcelEntity } from './parcel.entity';
import { ParcelsService } from './parcels.service';

type MockRepository = {
  find: (options: { order: Record<string, string> }) => Promise<ParcelEntity[]>;
  findOne: (options: { where: { id: string } }) => Promise<ParcelEntity | null>;
  create: (payload: Partial<ParcelEntity>) => ParcelEntity;
  save: (entity: ParcelEntity) => Promise<ParcelEntity>;
};

function createParcelsService(parcels: ParcelEntity[] = []) {
  const store = [...parcels];

  const repository: MockRepository = {
    find: async () => [...store],
    findOne: async ({ where }) => store.find((parcel) => parcel.id === where.id) ?? null,
    create: (payload) => ({
      id: payload.id!,
      customerName: payload.customerName!,
      description: payload.description!,
      amount: payload.amount!,
      status: payload.status ?? 'pending',
      date: payload.date ?? '2026-06-18',
      createdAt: new Date(),
    }),
    save: async (entity) => {
      const index = store.findIndex((parcel) => parcel.id === entity.id);
      if (index >= 0) {
        store[index] = entity;
      } else {
        store.push(entity);
      }
      return entity;
    },
  };

  return { service: new ParcelsService(repository as never), store };
}

test('create persists parcel with default status and date', async () => {
  const { service, store } = createParcelsService();

  const created = await service.create({
    id: 'parcel-1',
    customerName: 'Juan Pérez',
    description: 'Paquete mediano',
    amount: 250,
  });

  assert.equal(created.id, 'parcel-1');
  assert.equal(created.status, 'pending');
  assert.equal(store.length, 1);
});

test('create rejects duplicate parcel id', async () => {
  const existing: ParcelEntity = {
    id: 'parcel-dup',
    customerName: 'Cliente',
    description: 'Desc',
    amount: 100,
    status: 'pending',
    date: '2026-06-18',
    createdAt: new Date(),
  };
  const { service } = createParcelsService([existing]);

  await assert.rejects(
    () =>
      service.create({
        id: 'parcel-dup',
        customerName: 'Otro',
        description: 'Otro paquete',
        amount: 50,
      }),
    ConflictException,
  );
});

test('findOne returns parcel or throws NotFoundException', async () => {
  const existing: ParcelEntity = {
    id: 'parcel-find',
    customerName: 'Cliente',
    description: 'Desc',
    amount: 100,
    status: 'delivered',
    date: '2026-06-18',
    createdAt: new Date(),
  };
  const { service } = createParcelsService([existing]);

  const found = await service.findOne('parcel-find');
  assert.equal(found.status, 'delivered');

  await assert.rejects(() => service.findOne('missing'), NotFoundException);
});

test('findAll maps entities to response shape', async () => {
  const existing: ParcelEntity = {
    id: 'parcel-list',
    customerName: 'Cliente',
    description: 'Desc',
    amount: 75,
    status: 'pending',
    date: '2026-06-17',
    createdAt: new Date(),
  };
  const { service } = createParcelsService([existing]);

  const list = await service.findAll();
  assert.equal(list.length, 1);
  assert.equal(list[0]?.customerName, 'Cliente');
});
