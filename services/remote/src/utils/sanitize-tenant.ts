import type { Tenant } from '../types.js';

export type PublicTenant = Omit<Tenant, 'portalPasswordHash'>;

export function sanitizeTenant(tenant: Tenant): PublicTenant {
  const { portalPasswordHash: _hash, ...safe } = tenant;
  return safe;
}
