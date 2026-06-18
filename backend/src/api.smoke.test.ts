import assert from 'node:assert/strict';
import test from 'node:test';

const BASE_URL = process.env.POS_API_URL ?? 'http://127.0.0.1:3001/api';

type JsonBody = Record<string, unknown> | unknown[] | null;

let apiLive = false;

async function isApiReachable(): Promise<boolean> {
  try {
    const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(3000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function request(path: string, init?: RequestInit): Promise<{ response: Response; body: JsonBody }> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(8000),
    ...init,
  });

  const body = (await response.json().catch(() => null)) as JsonBody;
  return { response, body };
}

let adminToken: string | null = null;

const SMOKE_ADMIN_USERNAME = process.env.POS_TEST_USERNAME ?? 'smoke-admin';
const SMOKE_ADMIN_PASSWORD = process.env.POS_TEST_PASSWORD ?? 'smoke-test-pass-123';

async function ensureAdminToken(): Promise<string> {
  if (adminToken) {
    return adminToken;
  }

  const loginAttempt = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: SMOKE_ADMIN_USERNAME, password: SMOKE_ADMIN_PASSWORD }),
  });

  if (loginAttempt.response.status === 201) {
    const token = (loginAttempt.body as Record<string, unknown>).accessToken;
    assert.equal(typeof token, 'string');
    adminToken = token as string;
    return adminToken;
  }

  const { response: statusResponse, body: statusBody } = await request('/auth/setup-status');
  assert.equal(statusResponse.status, 200);
  const needsSetup = (statusBody as Record<string, unknown>).needsSetup;

  if (needsSetup === true) {
    const setup = await request('/auth/setup', {
      method: 'POST',
      body: JSON.stringify({
        username: SMOKE_ADMIN_USERNAME,
        password: SMOKE_ADMIN_PASSWORD,
        confirmPassword: SMOKE_ADMIN_PASSWORD,
      }),
    });
    assert.equal(setup.response.status, 201);
    const token = (setup.body as Record<string, unknown>).accessToken;
    assert.equal(typeof token, 'string');
    adminToken = token as string;
    return adminToken;
  }

  throw new Error(
    'No se pudo obtener token admin. Definí POS_TEST_USERNAME y POS_TEST_PASSWORD con credenciales válidas.',
  );
}

async function authedRequest(path: string, init?: RequestInit) {
  const token = await ensureAdminToken();
  return request(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

function skipIfOffline(t: { skip: (message?: string) => void }): boolean {
  if (!apiLive) {
    t.skip('pos-api no responde — levantar con: npm run dev:api');
    return true;
  }
  return false;
}

test.before(async () => {
  apiLive = await isApiReachable();
});

test('pos-api health', async (t) => {
  if (skipIfOffline(t)) return;
  const { response, body } = await request('');
  assert.equal(response.status, 200);
  assert.equal((body as Record<string, unknown>)?.status, 'ok');
  assert.equal((body as Record<string, unknown>)?.service, 'point-of-sale-backend');
});

test('products CRUD contract', async (t) => {
  if (skipIfOffline(t)) return;

  const productId = `smoke-${Date.now()}`;
  const payload = {
    id: productId,
    name: 'Cafe smoke test',
    price: 2500,
    cost: 1200,
    categories: ['Cafetería', 'Bebidas'],
    stock: 10,
    minStock: 2,
    unit: 'unidad',
    barcodes: ['1234567890123'],
  };

  const created = await authedRequest('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  assert.equal(created.response.status, 201);
  const createdBody = created.body as Record<string, unknown>;
  assert.equal(createdBody.id, productId);
  assert.equal(createdBody.name, payload.name);
  assert.equal(createdBody.price, payload.price);
  assert.deepEqual(createdBody.categories, payload.categories);
  assert.equal(createdBody.stock, payload.stock);
  assert.equal(createdBody.unit, payload.unit);

  const updated = await authedRequest(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ price: 2700, categories: payload.categories }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal((updated.body as Record<string, unknown>).price, 2700);

  const fetched = await authedRequest(`/products/${productId}`);
  assert.equal(fetched.response.status, 200);
  assert.equal((fetched.body as Record<string, unknown>).price, 2700);

  const removed = await authedRequest(`/products/${productId}`, { method: 'DELETE' });
  assert.equal(removed.response.status, 200);
  assert.equal((removed.body as Record<string, unknown>).deleted, true);
});

test('cash session and sale flow', async (t) => {
  if (skipIfOffline(t)) return;

  const stamp = Date.now();
  const productId = `smoke-sale-prod-${stamp}`;

  await authedRequest('/products', {
    method: 'POST',
    body: JSON.stringify({
      id: productId,
      name: 'Producto venta smoke',
      price: 100,
      categories: ['Otros'],
      stock: 5,
      unit: 'unidad',
    }),
  });

  const sessionState = await authedRequest('/cash/session');
  const currentSession = sessionState.body as Record<string, unknown> | null;

  if (!currentSession || currentSession.endTime) {
    const started = await authedRequest('/cash/session/start', {
      method: 'POST',
      body: JSON.stringify({ initialBalance: 1000 }),
    });
    assert.equal(started.response.status, 201);
  }

  const sessionBefore = await authedRequest('/cash/session');
  const totalBefore = Number((sessionBefore.body as Record<string, unknown>)?.totalSales ?? 0);

  const saleId = `smoke-sale-${stamp}`;
  const created = await authedRequest('/sales', {
    method: 'POST',
    body: JSON.stringify({
      id: saleId,
      items: [{ id: productId, name: 'Producto venta smoke', price: 100, quantity: 2 }],
      total: 200,
      payments: [{ type: 'cash', amount: 200, label: 'Efectivo' }],
      timestamp: new Date().toISOString(),
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>).total, 200);

  const productAfter = await authedRequest(`/products/${productId}`);
  assert.equal((productAfter.body as Record<string, unknown>).stock, 3);

  const sessionAfter = await authedRequest('/cash/session');
  assert.equal((sessionAfter.body as Record<string, unknown>).totalSales, totalBefore + 200);

  const list = await authedRequest('/sales');
  assert.ok(Array.isArray(list.body));
  assert.ok((list.body as Array<Record<string, unknown>>).some((sale) => sale.id === saleId));
});

test('cash GET and POST', async (t) => {
  if (skipIfOffline(t)) return;
  const listBefore = await authedRequest('/cash');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const created = await authedRequest('/cash', {
    method: 'POST',
    body: JSON.stringify({ description: 'Smoke test ingreso', amount: 100 }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.description, 'Smoke test ingreso');

  const listAfter = await authedRequest('/cash');
  assert.ok((listAfter.body as unknown[]).length >= (listBefore.body as unknown[]).length);
});

test('inventory GET and POST', async (t) => {
  if (skipIfOffline(t)) return;
  const listBefore = await authedRequest('/inventory');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const uniqueName = `smoke-inventory-${Date.now()}`;
  const created = await authedRequest('/inventory', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.name, uniqueName);

  const listAfter = await authedRequest('/inventory');
  const items = listAfter.body as Array<Record<string, unknown>>;
  assert.ok(items.some((item) => item.name === uniqueName));
});

test('AFIP integration health', async (t) => {
  if (skipIfOffline(t)) return;
  const { response, body } = await request('/integrations/afip/health');
  assert.equal(response.status, 200);
  const status = body as Record<string, unknown>;
  assert.equal(status.microservice, true);
  assert.equal(typeof status.afipReachable, 'boolean');
  assert.equal(typeof status.configured, 'boolean');
});

test('auth setup-status and login returns JWT', async (t) => {
  if (skipIfOffline(t)) return;

  const status = await request('/auth/setup-status');
  assert.equal(status.response.status, 200);
  assert.equal(typeof (status.body as Record<string, unknown>).needsSetup, 'boolean');

  const token = await ensureAdminToken();
  assert.equal(typeof token, 'string');
  assert.notEqual(token, 'scaffold-token');

  const me = await request('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(me.response.status, 200);
  assert.equal(typeof (me.body as Record<string, unknown>).username, 'string');
});

test('products lookup by barcode exact match', async (t) => {
  if (skipIfOffline(t)) return;

  const barcode = `smoke-bc-${Date.now()}`;
  const productId = `smoke-bc-prod-${Date.now()}`;
  await authedRequest('/products', {
    method: 'POST',
    body: JSON.stringify({
      id: productId,
      name: 'Producto barcode smoke',
      price: 50,
      categories: ['Otros'],
      stock: 1,
      unit: 'unidad',
      barcodes: [barcode],
    }),
  });

  const lookup = await authedRequest(`/products/by-barcode/${barcode}`);
  assert.equal(lookup.response.status, 200);
  assert.equal((lookup.body as Record<string, unknown>).id, productId);
});

const SAMPLE_AFIP_CERT = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKexample
-----END CERTIFICATE-----`;

const SAMPLE_AFIP_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCexample
-----END PRIVATE KEY-----`;

test('AFIP facturar requires full credentials', async (t) => {
  if (skipIfOffline(t)) return;

  const config = await request('/integrations/afip/config');
  assert.equal(config.response.status, 200);
  const configBody = config.body as Record<string, unknown>;

  if (configBody.configured) {
    return t.skip('AFIP ya está configurado en este entorno');
  }

  const result = await request('/integrations/afip/facturar', {
    method: 'POST',
    body: JSON.stringify({
      tipo_afip: 6,
      tipo_documento: 99,
      documento: '0',
      total: 100,
      id_condicion_iva: 5,
    }),
  });

  assert.equal(result.response.status, 400);
});

test('AFIP credentials partial then complete flow', async (t) => {
  if (skipIfOffline(t)) return;

  const configBefore = await request('/integrations/afip/config');
  assert.equal(configBefore.response.status, 200);

  if ((configBefore.body as Record<string, unknown>).hasCertificate) {
    return t.skip('Entorno ya tiene certificado AFIP; omitiendo flujo parcial destructivo');
  }

  const stamp = Date.now();
  const cuit = `20${String(stamp).slice(-9)}`;

  const keySaved = await request('/integrations/afip/private-key', {
    method: 'POST',
    body: JSON.stringify({
      cuit,
      clavePrivada: SAMPLE_AFIP_KEY,
      puntoVenta: 1,
      production: false,
    }),
  });
  assert.equal(keySaved.response.status, 201);

  const partialStatus = (keySaved.body as { status: Record<string, unknown> }).status;
  assert.equal(partialStatus.configured, false);
  assert.equal(partialStatus.pendingCertificate, true);
  assert.equal(partialStatus.hasPrivateKey, true);
  assert.equal(partialStatus.hasCertificate, false);

  const certSaved = await request('/integrations/afip/certificate', {
    method: 'POST',
    body: JSON.stringify({ certificado: SAMPLE_AFIP_CERT }),
  });
  assert.equal(certSaved.response.status, 201);

  const completeStatus = (certSaved.body as { status: Record<string, unknown> }).status;
  assert.equal(completeStatus.configured, true);
  assert.equal(completeStatus.pendingCertificate, false);
  assert.equal(completeStatus.hasCertificate, true);
});

test('AFIP real import test', async (t) => {
  if (process.env.RUN_AFIP_IMPORT_TEST !== 'true') {
    return t.skip('Set RUN_AFIP_IMPORT_TEST=true with real PEM env vars to run');
  }

  if (skipIfOffline(t)) return;

  const cuit = process.env.AFIP_TEST_CUIT;
  const certificado = process.env.AFIP_TEST_CERT;
  const clavePrivada = process.env.AFIP_TEST_KEY;

  if (!cuit || !certificado || !clavePrivada) {
    return t.skip('Missing AFIP_TEST_CUIT, AFIP_TEST_CERT, or AFIP_TEST_KEY');
  }

  const imported = await request('/integrations/afip/credentials', {
    method: 'POST',
    body: JSON.stringify({
      cuit,
      certificado,
      clavePrivada,
      puntoVenta: Number(process.env.AFIP_TEST_PUNTO_VENTA ?? 1),
      production: process.env.AFIP_TEST_PRODUCTION === 'true',
    }),
  });

  assert.equal(imported.response.status, 201);
  assert.equal((imported.body as { status: Record<string, unknown> }).status.configured, true);
});

test('GET /version returns monorepo version metadata', async (t) => {
  if (skipIfOffline(t)) return;

  const result = await request('/version');
  assert.equal(result.response.status, 200);
  assert.equal((result.body as Record<string, unknown>).name, 'point-of-sale');
  assert.ok(typeof (result.body as Record<string, unknown>).version === 'string');
  const components = (result.body as Record<string, unknown>).components as Record<string, string>;
  assert.ok(components.backend);
  assert.ok(components.frontend);
  assert.ok(components.desktop);
});

test('settings theme persistence', async (t) => {
  if (skipIfOffline(t)) return;

  const initial = await authedRequest('/settings/theme');
  assert.equal(initial.response.status, 200);
  assert.equal((initial.body as Record<string, unknown>).primaryColor, '#030213');
  assert.equal((initial.body as Record<string, unknown>).receiptWidthMm, 80);

  const updated = await authedRequest('/settings/theme', {
    method: 'PUT',
    body: JSON.stringify({ primaryColor: '#1a2b3c', receiptWidthMm: 55 }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal((updated.body as Record<string, unknown>).primaryColor, '#1a2b3c');
  assert.equal((updated.body as Record<string, unknown>).receiptWidthMm, 55);

  const restored = await authedRequest('/settings/theme', {
    method: 'PUT',
    body: JSON.stringify({ primaryColor: '#030213', receiptWidthMm: 80 }),
  });
  assert.equal(restored.response.status, 200);
  assert.equal((restored.body as Record<string, unknown>).primaryColor, '#030213');
});

test('parcels CRUD contract', async (t) => {
  if (skipIfOffline(t)) return;

  const parcelId = `smoke-parcel-${Date.now()}`;
  const created = await authedRequest('/parcels', {
    method: 'POST',
    body: JSON.stringify({
      id: parcelId,
      customerName: 'Cliente smoke',
      description: 'Paquete test',
      amount: 150,
      status: 'pending',
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>).id, parcelId);

  const fetched = await authedRequest(`/parcels/${parcelId}`);
  assert.equal(fetched.response.status, 200);
  assert.equal((fetched.body as Record<string, unknown>).customerName, 'Cliente smoke');

  const list = await authedRequest('/parcels');
  assert.ok(Array.isArray(list.body));
  assert.ok((list.body as Array<Record<string, unknown>>).some((parcel) => parcel.id === parcelId));
});

test('auth setup returns 409 when already completed', async (t) => {
  if (skipIfOffline(t)) return;

  await ensureAdminToken();

  const secondSetup = await request('/auth/setup', {
    method: 'POST',
    body: JSON.stringify({
      username: 'another-admin',
      password: 'another-pass-123',
      confirmPassword: 'another-pass-123',
    }),
  });
  assert.equal(secondSetup.response.status, 409);
});

test('users PATCH isActive requires admin role', async (t) => {
  if (skipIfOffline(t)) return;

  const me = await authedRequest('/auth/me');
  assert.equal(me.response.status, 200);
  const userId = (me.body as Record<string, unknown>).id as string;

  const unauthenticated = await request(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });
  assert.equal(unauthenticated.response.status, 401);

  const updated = await authedRequest(`/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal((updated.body as Record<string, unknown>).isActive, true);
});

test('settings theme logo upload, serve bytes, and delete', async (t) => {
  if (skipIfOffline(t)) return;

  const tinyPngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

  const uploaded = await authedRequest('/settings/theme/logo', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: `data:image/png;base64,${tinyPngBase64}` }),
  });
  assert.equal(uploaded.response.status, 201);
  assert.equal((uploaded.body as Record<string, unknown>).logoUrl, '/settings/theme/logo');

  const logoResponse = await fetch(`${BASE_URL}/settings/theme/logo`, {
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(logoResponse.status, 200);
  assert.match(logoResponse.headers.get('content-type') ?? '', /image\/png/);
  const logoBytes = Buffer.from(await logoResponse.arrayBuffer());
  assert.ok(logoBytes.length > 0);

  const deleted = await authedRequest('/settings/theme/logo', { method: 'DELETE' });
  assert.equal(deleted.response.status, 200);
  assert.equal((deleted.body as Record<string, unknown>).logoUrl, undefined);

  const missingLogo = await fetch(`${BASE_URL}/settings/theme/logo`, {
    signal: AbortSignal.timeout(8000),
  });
  assert.equal(missingLogo.status, 404);
});

test('support recovery unlock returns 503 when server has no secret', async (t) => {
  if (skipIfOffline(t)) return;

  const result = await request('/support/recovery/unlock', {
    method: 'POST',
    headers: { 'X-Support-Recovery-Key': 'any-key-value-here' },
    body: JSON.stringify({}),
  });

  if (result.response.status === 503) {
    assert.equal(result.response.status, 503);
    return;
  }

  t.skip('SUPPORT_RECOVERY_SECRET configurado en el servidor; ruta 503 cubierta por unit tests');
});

test('support recovery unlock returns 401 with wrong key when enabled', async (t) => {
  if (skipIfOffline(t)) return;

  const result = await request('/support/recovery/unlock', {
    method: 'POST',
    headers: { 'X-Support-Recovery-Key': 'wrong-recovery-key' },
    body: JSON.stringify({}),
  });

  if (result.response.status === 503) {
    return t.skip('Recovery deshabilitado en el servidor (sin SUPPORT_RECOVERY_SECRET)');
  }

  assert.equal(result.response.status, 401);
});
