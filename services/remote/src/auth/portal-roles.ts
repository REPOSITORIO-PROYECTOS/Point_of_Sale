import type { PortalAuthPayload, PortalRole } from '../types.js';

const DEVELOPER_TENANT_ID = 'developer';

export type DeveloperAccount = {
  email: string;
  passwordHash: string;
  displayName: string;
};

export function normalizePortalEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function buildDeveloperPayload(account: DeveloperAccount): PortalAuthPayload {
  return {
    role: 'developer',
    email: account.email,
    portalUserId: 'portal-developer',
    tenantId: DEVELOPER_TENANT_ID,
    tenantName: account.displayName,
  };
}

export function isDeveloperPayload(payload: PortalAuthPayload): boolean {
  return payload.role === 'developer';
}

export function assertDeveloperSession(session: PortalAuthPayload | undefined): PortalAuthPayload {
  if (!session || session.role !== 'developer') {
    throw new Error('Acceso solo para desarrollador');
  }

  return session;
}

export { DEVELOPER_TENANT_ID };
export type { PortalRole };
