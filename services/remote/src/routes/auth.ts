import type { FastifyInstance, FastifyRequest } from 'fastify';
import { sessionStore } from '../auth/session-store.js';
import { assertDeveloperSession } from '../auth/portal-roles.js';
import { store } from '../store/memory-store.js';
import { sanitizeTenant } from '../utils/sanitize-tenant.js';

type LoginBody = {
  email: string;
  password: string;
};

type RegisterClientBody = {
  name: string;
  email: string;
  password: string;
};

function readBearerToken(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return undefined;
  }

  return header.slice('Bearer '.length).trim();
}

function readSession(request: FastifyRequest) {
  const sessionToken = readBearerToken(request);
  if (!sessionToken) {
    return null;
  }

  return sessionStore.get(sessionToken) ?? null;
}

type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

type SendMessageBody = {
  body: string;
};

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: LoginBody }>('/auth/login', async (request, reply) => {
    const { email, password } = request.body ?? {};

    if (!email?.trim()) {
      return reply.code(400).send({ error: 'email is required' });
    }

    try {
      const payload = await store.loginByEmail(email, password ?? '');
      const { sessionToken, expiresAt } = sessionStore.create(payload);
      return reply.send({ ...payload, sessionToken, expiresAt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.code(401).send({ error: message });
    }
  });

  app.get('/auth/me', async (request, reply) => {
    const sessionToken = readBearerToken(request);
    if (!sessionToken) {
      return reply.code(401).send({ error: 'Missing session token' });
    }

    const session = sessionStore.get(sessionToken);
    if (!session) {
      return reply.code(401).send({ error: 'Session expired or invalid' });
    }

    if (session.role === 'developer') {
      return reply.send({
        role: session.role,
        email: session.email,
        portalUserId: session.portalUserId,
        tenantId: session.tenantId,
        tenantName: session.tenantName,
        sessionToken,
        expiresAt: session.expiresAt,
      });
    }

    const tenant = store.getTenantById(session.tenantId ?? '');
    if (!tenant) {
      sessionStore.revoke(sessionToken);
      return reply.code(401).send({ error: 'Tenant no longer exists' });
    }

    return reply.send({
      role: 'client',
      email: session.email,
      clientNumber: tenant.clientNumber,
      tenantId: tenant.id,
      tenantName: tenant.name,
      portalUserId: session.portalUserId,
      sessionToken,
      expiresAt: session.expiresAt,
    });
  });

  app.post('/auth/logout', async (request, reply) => {
    const sessionToken = readBearerToken(request);
    if (sessionToken) {
      sessionStore.revoke(sessionToken);
    }

    return reply.send({ ok: true });
  });

  app.post<{ Body: RegisterClientBody }>('/auth/register-client', async (request, reply) => {
    const { name, email, password } = request.body ?? {};

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return reply.code(400).send({ error: 'name, email and password are required' });
    }

    try {
      const result = await store.registerClientWithCredentials(name, email, password);
      return reply.code(201).send({
        ...result,
        tenant: sanitizeTenant(result.tenant),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to register client';
      return reply.code(400).send({ error: message });
    }
  });

  app.get('/auth/next-client-number', async (_request, reply) => {
    return reply.send({ clientNumber: store.generateClientNumber() });
  });

  app.get('/admin/clients-overview', async (request, reply) => {
    const session = readSession(request);
    if (!session) {
      return reply.code(401).send({ error: 'Missing session token' });
    }

    try {
      assertDeveloperSession(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Forbidden';
      return reply.code(403).send({ error: message });
    }

    return reply.send({ clients: store.listClientsOverview() });
  });

  app.post<{ Body: ChangePasswordBody }>('/auth/change-password', async (request, reply) => {
    const session = readSession(request);
    if (!session) {
      return reply.code(401).send({ error: 'Missing session token' });
    }

    if (session.role !== 'client') {
      return reply.code(403).send({ error: 'Solo clientes pueden cambiar contraseña acá' });
    }

    const { currentPassword, newPassword } = request.body ?? {};
    if (!currentPassword?.trim() || !newPassword?.trim()) {
      return reply.code(400).send({ error: 'currentPassword and newPassword are required' });
    }

    try {
      await store.changeClientPassword(session.email, currentPassword, newPassword);
      return reply.send({ ok: true, message: 'Contraseña actualizada' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password';
      return reply.code(400).send({ error: message });
    }
  });

  app.get('/messages', async (request, reply) => {
    const session = readSession(request);
    if (!session) {
      return reply.code(401).send({ error: 'Missing session token' });
    }

    if (session.role !== 'client' || !session.tenantId) {
      return reply.code(403).send({ error: 'Solo clientes pueden ver sus mensajes' });
    }

    return reply.send({ messages: store.listMessagesForTenantId(session.tenantId) });
  });

  app.patch<{ Params: { messageId: string } }>('/messages/:messageId/read', async (request, reply) => {
    const session = readSession(request);
    if (!session) {
      return reply.code(401).send({ error: 'Missing session token' });
    }

    if (session.role !== 'client' || !session.tenantId) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    try {
      const message = store.markTenantMessageRead(session.tenantId, request.params.messageId);
      return reply.send({ message });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to mark message read';
      return reply.code(404).send({ error: message });
    }
  });

  app.post<{ Params: { clientNumber: string }; Body: SendMessageBody }>(
    '/admin/tenants/:clientNumber/messages',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      try {
        assertDeveloperSession(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      const { body } = request.body ?? {};
      if (!body?.trim()) {
        return reply.code(400).send({ error: 'body is required' });
      }

      try {
        const message = store.sendDeveloperMessage(
          request.params.clientNumber,
          session.email,
          body,
        );
        return reply.code(201).send({ message });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to send message';
        return reply.code(400).send({ error: message });
      }
    },
  );

  app.get<{ Params: { clientNumber: string } }>(
    '/admin/tenants/:clientNumber/messages',
    async (request, reply) => {
      const session = readSession(request);
      if (!session) {
        return reply.code(401).send({ error: 'Missing session token' });
      }

      try {
        assertDeveloperSession(session);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Forbidden';
        return reply.code(403).send({ error: message });
      }

      return reply.send({ messages: store.listTenantMessages(request.params.clientNumber) });
    },
  );
}
