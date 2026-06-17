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

function skipIfOffline(t: { skip: (message?: string) => void }) {
  if (!apiLive) {
    t.skip('pos-api no responde — levantar con: npm run dev:api');
  }
}

test.before(async () => {
  apiLive = await isApiReachable();
});

test('pos-api health', async (t) => {
  skipIfOffline(t);
  const { response, body } = await request('');
  assert.equal(response.status, 200);
  assert.equal((body as Record<string, unknown>)?.status, 'ok');
  assert.equal((body as Record<string, unknown>)?.service, 'point-of-sale-backend');
});

test('products GET and POST', async (t) => {
  skipIfOffline(t);
  const listBefore = await request('/products');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const uniqueName = `smoke-product-${Date.now()}`;
  const created = await request('/products', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.name, uniqueName);

  const listAfter = await request('/products');
  const items = listAfter.body as Array<Record<string, unknown>>;
  assert.ok(items.some((item) => item.name === uniqueName));
});

test('sales GET and POST', async (t) => {
  skipIfOffline(t);
  const listBefore = await request('/sales');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const created = await request('/sales', {
    method: 'POST',
    body: JSON.stringify({ productId: 'smoke-product-1', quantity: 1 }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.productId, 'smoke-product-1');

  const listAfter = await request('/sales');
  assert.ok((listAfter.body as unknown[]).length >= (listBefore.body as unknown[]).length);
});

test('cash GET and POST', async (t) => {
  skipIfOffline(t);
  const listBefore = await request('/cash');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const created = await request('/cash', {
    method: 'POST',
    body: JSON.stringify({ description: 'Smoke test ingreso', amount: 100 }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.description, 'Smoke test ingreso');

  const listAfter = await request('/cash');
  assert.ok((listAfter.body as unknown[]).length >= (listBefore.body as unknown[]).length);
});

test('inventory GET and POST', async (t) => {
  skipIfOffline(t);
  const listBefore = await request('/inventory');
  assert.equal(listBefore.response.status, 200);
  assert.ok(Array.isArray(listBefore.body));

  const uniqueName = `smoke-inventory-${Date.now()}`;
  const created = await request('/inventory', {
    method: 'POST',
    body: JSON.stringify({ name: uniqueName }),
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body as Record<string, unknown>)?.name, uniqueName);

  const listAfter = await request('/inventory');
  const items = listAfter.body as Array<Record<string, unknown>>;
  assert.ok(items.some((item) => item.name === uniqueName));
});

test('AFIP integration health', async (t) => {
  skipIfOffline(t);
  const { response, body } = await request('/integrations/afip/health');
  assert.equal(response.status, 200);
  const status = body as Record<string, unknown>;
  assert.equal(status.microservice, true);
  assert.equal(typeof status.afipReachable, 'boolean');
  assert.equal(typeof status.configured, 'boolean');
});
