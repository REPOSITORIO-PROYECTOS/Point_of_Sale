import type { FastifyInstance } from 'fastify';
import { store } from '../store/memory-store.js';

type CreateTenantBody = {
  clientNumber: string;
  name: string;
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
  app.post<{ Body: CreateTenantBody }>('/admin/tenants', async (request, reply) => {
    const { clientNumber, name } = request.body;

    if (!clientNumber?.trim() || !name?.trim()) {
      return reply.code(400).send({ error: 'clientNumber and name are required' });
    }

    try {
      const tenant = store.createTenant(clientNumber, name);
      return reply.code(201).send(tenant);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create tenant';
      return reply.code(409).send({ error: message });
    }
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

      const registers = store.listRegisters(clientNumber).map((register) => ({
        id: register.id,
        label: register.label,
        machineId: register.machineId,
        online: register.online,
        lastSeen: register.lastSeen,
        assignedPortalUserIds: register.assignedPortalUserIds,
        paired: Boolean(register.deviceToken),
      }));

      return reply.send({ clientNumber: tenant.clientNumber, name: tenant.name, registers });
    },
  );
}
