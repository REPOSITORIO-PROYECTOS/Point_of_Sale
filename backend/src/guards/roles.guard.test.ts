import assert from 'node:assert/strict';
import test from 'node:test';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@/auth/auth.types';
import { ROLES_KEY } from '@/decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function createContext(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as ExecutionContext;
}

test('RolesGuard allows access when no roles are required', () => {
  const reflector = {
    getAllAndOverride: () => undefined,
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  assert.equal(guard.canActivate(createContext()), true);
});

test('RolesGuard allows admin on admin-only route', () => {
  const reflector = {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? ['admin'] : undefined),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const user: AuthUser = { id: 'admin-1', username: 'admin', role: 'admin' };

  assert.equal(guard.canActivate(createContext(user)), true);
});

test('RolesGuard rejects cashier on admin-only route', () => {
  const reflector = {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? ['admin'] : undefined),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const user: AuthUser = { id: 'cashier-1', username: 'cajero', role: 'cashier' };

  assert.throws(() => guard.canActivate(createContext(user)), ForbiddenException);
});

test('RolesGuard rejects unauthenticated requests on protected route', () => {
  const reflector = {
    getAllAndOverride: (key: string) => (key === ROLES_KEY ? ['admin'] : undefined),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  assert.throws(() => guard.canActivate(createContext()), ForbiddenException);
});
