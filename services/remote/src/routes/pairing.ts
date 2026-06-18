import type { FastifyInstance } from 'fastify';
import { store } from '../store/memory-store.js';

type PairingRequestBody = {
  clientNumber: string;
  registerLabel: string;
  machineId?: string;
};

type PairingConfirmBody = {
  code: string;
  portalUserId: string;
};

type PairingCompleteBody = {
  code: string;
};

export async function registerPairingRoutes(app: FastifyInstance, ttlMinutes: number): Promise<void> {
  app.post<{ Body: PairingRequestBody }>('/pairing/request', async (request, reply) => {
    const { clientNumber, registerLabel, machineId } = request.body;

    if (!clientNumber?.trim() || !registerLabel?.trim()) {
      return reply.code(400).send({ error: 'clientNumber and registerLabel are required' });
    }

    try {
      const pairing = store.requestPairingCode(clientNumber, registerLabel, machineId, ttlMinutes);
      return reply.code(201).send({
        code: pairing.code,
        expiresAt: pairing.expiresAt,
        registerId: pairing.registerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create pairing code';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Body: PairingConfirmBody }>('/pairing/confirm', async (request, reply) => {
    const { code, portalUserId } = request.body;

    if (!code?.trim() || !portalUserId?.trim()) {
      return reply.code(400).send({ error: 'code and portalUserId are required' });
    }

    try {
      const pairing = store.confirmPairing(code.trim().toUpperCase(), portalUserId.trim());
      const tenant = store.getTenantById(pairing.tenantId);
      const register = store.getRegisterById(pairing.registerId);

      return reply.send({
        code: pairing.code,
        confirmed: pairing.confirmed,
        clientNumber: tenant?.clientNumber,
        registerId: pairing.registerId,
        registerLabel: register?.label,
        portalUserId: pairing.confirmedByPortalUserId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to confirm pairing';
      return reply.code(400).send({ error: message });
    }
  });

  app.post<{ Body: PairingCompleteBody }>('/pairing/complete', async (request, reply) => {
    const { code } = request.body;

    if (!code?.trim()) {
      return reply.code(400).send({ error: 'code is required' });
    }

    try {
      const result = store.completePairing(code.trim().toUpperCase());
      return reply.send({
        deviceToken: result.deviceToken,
        clientNumber: result.tenant.clientNumber,
        registerId: result.register.id,
        registerLabel: result.register.label,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to complete pairing';
      return reply.code(400).send({ error: message });
    }
  });
}
