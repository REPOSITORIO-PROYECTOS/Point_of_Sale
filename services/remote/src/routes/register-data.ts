import type { FastifyInstance } from 'fastify';
import { assertRegisterAccess, readSession } from '../auth/session.js';
import { commandQueue } from '../store/command-queue.js';
import { store } from '../store/memory-store.js';
import { normalizeCashHistory, normalizeCatalog } from '../normalize-register-data.js';
import { wsHub } from '../ws/hub.js';

type IncreasePricesBody = {
  category: string;
  percent: number;
};

export async function registerRegisterDataRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { clientNumber: string; registerId: string }; Querystring: { refresh?: string } }>(
    '/tenants/:clientNumber/registers/:registerId/catalog',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      const { clientNumber, registerId } = request.params;

      try {
        assertRegisterAccess(session, clientNumber);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      const register = store.getRegister(clientNumber, registerId);
      if (!register) {
        return reply.code(404).send({ error: 'Register not found' });
      }

      const shouldRefresh = request.query.refresh === '1' || request.query.refresh === 'true';
      const cached = store.getCatalog(clientNumber, registerId);

      if (!shouldRefresh && cached) {
        return reply.send(cached);
      }

      if (!wsHub.isRegisterOnline(registerId)) {
        if (cached) {
          return reply.send({ ...cached, stale: true });
        }

        return reply.code(503).send({ error: 'La caja está offline. Conectá el POS para traer precios.' });
      }

      try {
        const payload = await wsHub.sendCommand(registerId, 'get_catalog');
        const catalog = store.setCatalog(normalizeCatalog(clientNumber, registerId, payload));
        return reply.send(catalog);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to fetch catalog';
        if (cached) {
          return reply.send({ ...cached, stale: true, error: message });
        }

        return reply.code(503).send({ error: message });
      }
    },
  );

  app.get<{ Params: { clientNumber: string; registerId: string }; Querystring: { refresh?: string } }>(
    '/tenants/:clientNumber/registers/:registerId/cash-sessions/history',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      const { clientNumber, registerId } = request.params;

      try {
        assertRegisterAccess(session, clientNumber);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      const register = store.getRegister(clientNumber, registerId);
      if (!register) {
        return reply.code(404).send({ error: 'Register not found' });
      }

      const shouldRefresh = request.query.refresh === '1' || request.query.refresh === 'true';
      const cached = store.getCashHistory(clientNumber, registerId);

      if (!shouldRefresh && cached) {
        return reply.send(cached);
      }

      if (!wsHub.isRegisterOnline(registerId)) {
        if (cached) {
          return reply.send({ ...cached, stale: true });
        }

        return reply.code(503).send({ error: 'La caja está offline. Conectá el POS para ver cierres.' });
      }

      try {
        const payload = await wsHub.sendCommand(registerId, 'get_cash_history', { limit: 50 });
        const history = store.setCashHistory(normalizeCashHistory(clientNumber, registerId, payload));
        return reply.send(history);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to fetch cash history';
        if (cached) {
          return reply.send({ ...cached, stale: true, error: message });
        }

        return reply.code(503).send({ error: message });
      }
    },
  );

  app.post<{ Params: { clientNumber: string; registerId: string }; Body: IncreasePricesBody }>(
    '/tenants/:clientNumber/registers/:registerId/commands/increase-prices',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      const { clientNumber, registerId } = request.params;
      const { category, percent } = request.body ?? {};

      try {
        assertRegisterAccess(session, clientNumber);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      const register = store.getRegister(clientNumber, registerId);
      if (!register) {
        return reply.code(404).send({ error: 'Register not found' });
      }

      if (!category?.trim() || !Number.isFinite(percent) || percent <= 0) {
        return reply.code(400).send({ error: 'category and positive percent are required' });
      }

      if (!wsHub.isRegisterOnline(registerId)) {
        const queued = commandQueue.enqueue({
          registerId,
          clientNumber,
          action: 'increase_prices_by_category',
          payload: {
            category: category.trim(),
            percent,
          },
        });

        return reply.code(202).send({
          ok: true,
          deferred: true,
          queuedCommand: queued,
          message: `Aumento de ${percent}% para "${category.trim()}" en cola. Se aplicará cuando la caja se conecte.`,
        });
      }

      try {
        const result = await wsHub.sendCommand(registerId, 'increase_prices_by_category', {
          category: category.trim(),
          percent,
        });

        const catalogPayload = await wsHub.sendCommand(registerId, 'get_catalog');
        const catalog = store.setCatalog(normalizeCatalog(clientNumber, registerId, catalogPayload));

        return reply.send({
          ok: true,
          result,
          catalog,
          message: `Precios actualizados en la caja para "${category.trim()}" (+${percent}%)`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update prices';
        return reply.code(503).send({ error: message });
      }
    },
  );

  app.get<{ Params: { clientNumber: string; registerId: string } }>(
    '/tenants/:clientNumber/registers/:registerId/commands/pending',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      const { clientNumber, registerId } = request.params;

      try {
        assertRegisterAccess(session, clientNumber);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      const register = store.getRegister(clientNumber, registerId);
      if (!register) {
        return reply.code(404).send({ error: 'Register not found' });
      }

      return reply.send({
        registerOnline: wsHub.isRegisterOnline(registerId),
        commands: commandQueue.listForRegister(clientNumber, registerId),
      });
    },
  );
}
