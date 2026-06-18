import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerHealthRoutes } from './routes/health.js';
import { registerPairingRoutes } from './routes/pairing.js';
import { registerSnapshotRoutes } from './routes/snapshots.js';
import { registerTenantRoutes } from './routes/tenants.js';
import { wsHub } from './ws/hub.js';
import { store } from './store/memory-store.js';

function seedDemoData(): void {
  try {
    const tenant = store.createTenant('CLI-00001', 'Cliente demo');
    const register = store.createRegister(tenant.clientNumber, 'Caja 1', ['portal-cli-00001']);
    store.setSnapshot({
      registerId: register.id,
      clientNumber: tenant.clientNumber,
      label: register.label,
      online: false,
      lastSyncAt: new Date().toISOString(),
      cashSession: {
        open: true,
        openedAt: new Date().toISOString(),
        openingBalance: 10_000,
        salesTotal: 125_400,
        expectedBalance: 135_400,
      },
      salesToday: { count: 42, total: 125_400 },
      stockAlerts: 3,
      licenseStatus: 'active',
      agentVersion: '0.0.1-demo',
      currency: 'ARS',
    });
  } catch {
    // demo tenant may already exist after hot reload
  }
}

const port = Number(process.env.PORT ?? 5090);
const host = process.env.HOST ?? '127.0.0.1';
const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const pairingTtlMinutes = Number(process.env.PAIRING_TTL_MINUTES ?? 15);

async function bootstrap(): Promise<void> {
  seedDemoData();
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
  });

  await app.register(websocket);

  await registerHealthRoutes(app);
  await registerTenantRoutes(app);
  await registerPairingRoutes(app, pairingTtlMinutes);
  await registerSnapshotRoutes(app);

  app.get('/ws/agent', { websocket: true }, (socket, request) => {
    const query = request.query as { deviceToken?: string };
    const deviceToken = String(query.deviceToken ?? '');
    wsHub.handleAgentConnection(socket, deviceToken);
  });

  app.get('/ws/portal', { websocket: true }, (socket) => {
    wsHub.handlePortalConnection(socket);
  });

  await app.listen({ port, host });
  app.log.info(`Remote relay listening on http://${host}:${port}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
