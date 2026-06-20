import type { FastifyInstance } from 'fastify';
import { store } from '../store/memory-store.js';
import { sanitizeTenant } from '../utils/sanitize-tenant.js';

type CreateTenantBody = {
  clientNumber: string;
  name: string;
  contactEmail: string;
  portalPassword?: string;
};

type CreateRegisterBody = {
  clientNumber: string;
  registerLabel: string;
  portalUserIds?: string[];
};

type AssignRegistersBody = {
  registerIds: string[];
  portalUserId: string;
};

export async function registerTenantRoutes(app: FastifyInstance): Promise<void> {
  app.get('/admin/tenants', async (_request, reply) => {
    return reply.send({ tenants: store.listTenants().map(sanitizeTenant) });
  });

  app.post<{ Body: CreateTenantBody }>('/admin/tenants', async (request, reply) => {
    const { clientNumber, name, contactEmail, portalPassword } = request.body;

    if (!clientNumber?.trim() || !name?.trim() || !contactEmail?.trim()) {
      return reply.code(400).send({ error: 'clientNumber, name and contactEmail are required' });
    }

    try {
      const tenant = await store.createTenant(clientNumber, name, contactEmail, portalPassword);
      return reply.code(201).send(sanitizeTenant(tenant));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create tenant';
      return reply.code(409).send({ error: message });
    }
  });

  app.get<{ Params: { clientNumber: string } }>('/tenants/:clientNumber', async (request, reply) => {
    const detail = store.getTenantDetail(request.params.clientNumber);

    if (!detail) {
      return reply.code(404).send({ error: 'Tenant not found' });
    }

    return reply.send(detail);
  });

  app.post<{ Body: CreateRegisterBody }>('/admin/registers', async (request, reply) => {
    const { clientNumber, registerLabel, portalUserIds } = request.body;

    if (!clientNumber?.trim() || !registerLabel?.trim()) {
      return reply.code(400).send({ error: 'clientNumber and registerLabel are required' });
    }

    try {
      const register = store.createRegister(clientNumber, registerLabel, portalUserIds ?? []);
      return reply.code(201).send(register);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create register';
      return reply.code(404).send({ error: message });
    }
  });

  app.post<{ Body: AssignRegistersBody }>('/admin/assign-registers', async (request, reply) => {
    const { registerIds, portalUserId } = request.body;

    if (!portalUserId?.trim() || !Array.isArray(registerIds) || registerIds.length === 0) {
      return reply.code(400).send({ error: 'registerIds and portalUserId are required' });
    }

    const updated = registerIds.map((registerId) => store.assignPortalUsers(registerId, [portalUserId]));
    return reply.send({ registers: updated });
  });

  app.get<{ Params: { clientNumber: string } }>(
    '/tenants/:clientNumber/registers',
    async (request, reply) => {
      const { clientNumber } = request.params;
      const tenant = store.getTenantByClientNumber(clientNumber);

      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      const detail = store.getTenantDetail(clientNumber);
      return reply.send({
        clientNumber: tenant.clientNumber,
        name: tenant.name,
        contactEmail: tenant.contactEmail,
        registers: detail?.registers ?? [],
      });
    },
  );
}
