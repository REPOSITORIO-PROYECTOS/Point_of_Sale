import type { FastifyInstance } from 'fastify';
import { store } from '../store/memory-store.js';

export async function registerSnapshotRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { clientNumber: string; registerId: string } }>(
    '/tenants/:clientNumber/registers/:registerId/snapshot',
    async (request, reply) => {
      const { clientNumber, registerId } = request.params;
      const register = store.getRegister(clientNumber, registerId);

      if (!register) {
        return reply.code(404).send({ error: 'Register not found' });
      }

      const snapshot = store.getSnapshot(clientNumber, registerId);
      return reply.send(snapshot);
    },
  );
}
