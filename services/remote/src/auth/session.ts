import type { FastifyRequest } from 'fastify';
import { sessionStore } from './session-store.js';
import { assertDeveloperSession } from './portal-roles.js';
import { store } from '../store/memory-store.js';
import type { PortalAuthPayload } from '../types.js';

export function readBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }

  return header.slice('Bearer '.length).trim();
}

export function readSession(request: FastifyRequest): PortalAuthPayload | null {
  const sessionToken = readBearerToken(request);
  if (!sessionToken) {
    return null;
  }

  return sessionStore.get(sessionToken) ?? null;
}

export function assertRegisterAccess(session: PortalAuthPayload, clientNumber: string): void {
  if (session.role === 'developer') {
    return;
  }

  const tenant = store.getTenantById(session.tenantId ?? '');
  if (!tenant || tenant.clientNumber !== clientNumber.trim().toUpperCase()) {
    throw new Error('No tenés acceso a esta caja');
  }
}

export { assertDeveloperSession };
