#!/usr/bin/env node

import { POS_PORTS } from '../config/ports.mjs';

const POS_API_URL = process.env.POS_API_URL ?? `http://127.0.0.1:${POS_PORTS.api}/api`;
const AFIP_URL = process.env.AFIP_SERVICE_URL ?? `http://127.0.0.1:${POS_PORTS.afip}`;
const AFIP_TEST_PATHS = ['/api/afipws/test', '/afipws/test'];

const results = [];

function record(name, passed, details = '') {
  results.push({ name, passed, details });
  const icon = passed ? 'PASS' : 'FAIL';
  console.log(`${icon} ${name}${details ? ` — ${details}` : ''}`);
}

async function fetchJson(url, options) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(8000),
  });

  const text = await response.text();
  let body = text;

  try {
    body = JSON.parse(text);
  } catch {
    // keep raw text
  }

  return { response, body };
}

async function testPosApiHealth() {
  try {
    const { response, body } = await fetchJson(POS_API_URL);
    const ok = response.ok && body?.service === 'point-of-sale-backend' && body?.status === 'ok';
    record('pos-api health', ok, `status=${response.status}`);
    record('pos-api exposes AFIP config flag', body?.afipConfigured === true, `afipConfigured=${body?.afipConfigured}`);
    return ok;
  } catch (error) {
    record('pos-api health', false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testPosApiAfipIntegration() {
  try {
    const { response, body } = await fetchJson(`${POS_API_URL}/integrations/afip/health`);
    const ok =
      response.ok &&
      body?.microservice === true &&
      typeof body?.configured === 'boolean' &&
      typeof body?.afipReachable === 'boolean';

    record(
      'pos-api -> AFIP integration health',
      ok,
      `reachable=${body?.afipReachable}, path=${body?.matchedPath ?? 'n/a'}`,
    );

    if (!body?.afipReachable) {
      record(
        'AFIP microservice optional when down',
        response.ok,
        'pos-api sigue respondiendo aunque AFIP no este levantado',
      );
    }

    return ok;
  } catch (error) {
    record('pos-api -> AFIP integration health', false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

function isAfipHealthBody(body) {
  return (
    body?.test === 'ok' ||
    body?.mensaje ||
    body?.success !== undefined ||
    (typeof body === 'object' && body !== null && !Array.isArray(body))
  );
}

async function testAfipDirect() {
  const attempts = [];

  for (const testPath of AFIP_TEST_PATHS) {
    const url = `${AFIP_URL.replace(/\/$/, '')}${testPath}`;

    try {
      const { response, body } = await fetchJson(url);
      const ok = response.ok && isAfipHealthBody(body);
      attempts.push({ url, ok, status: response.status });

      if (ok) {
        record('AFIP microservice direct health', true, `${url} status=${response.status}`);
        return true;
      }
    } catch (error) {
      attempts.push({
        url,
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const detail =
    attempts.length > 0
      ? attempts.map((item) => `${item.url} → ${item.ok ? 'ok' : item.detail ?? `status=${item.status}`}`).join('; ')
      : 'Levanta Docker Desktop y ejecuta: npm run dev:afip';

  record('AFIP microservice direct health', false, detail);
  return false;
}

async function testAfipConfigEndpoint() {
  try {
    const { response, body } = await fetchJson(`${POS_API_URL}/integrations/afip/config`);
    const ok = response.ok && typeof body?.configured === 'boolean' && typeof body?.hasCertificate === 'boolean';
    record('pos-api AFIP config endpoint', ok, `configured=${body?.configured}`);
    return ok;
  } catch (error) {
    record('pos-api AFIP config endpoint', false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testAfipCredentialsImport() {
  if (process.env.RUN_AFIP_IMPORT_TEST !== 'true') {
    record('AFIP credentials import', true, 'skipped (set RUN_AFIP_IMPORT_TEST=true to run)');
    return true;
  }

  const sampleCert = `-----BEGIN CERTIFICATE-----\nTESTCERT\n-----END CERTIFICATE-----\n`;
  const sampleKey = `-----BEGIN PRIVATE KEY-----\nTESTKEY\n-----END PRIVATE KEY-----\n`;

  try {
    const { response, body } = await fetchJson(`${POS_API_URL}/integrations/afip/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuit: '20123456789',
        certificado: sampleCert,
        clavePrivada: sampleKey,
        puntoVenta: 1,
        production: false,
      }),
    });

    const ok = response.ok && body?.status?.configured === true;
    record('AFIP credentials import', ok, `configured=${body?.status?.configured}`);
    return ok;
  } catch (error) {
    record('AFIP credentials import', false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testPosApiModule(name, path, postPayload) {
  try {
    const list = await fetchJson(`${POS_API_URL}${path}`);
    const listOk = list.response.ok && Array.isArray(list.body);
    record(`pos-api ${name} GET`, listOk, `items=${Array.isArray(list.body) ? list.body.length : 'n/a'}`);

    if (!postPayload) {
      return listOk;
    }

    const created = await fetchJson(`${POS_API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload),
    });
    const postOk = created.response.ok && created.response.status === 201;
    record(`pos-api ${name} POST`, postOk, `status=${created.response.status}`);
    return listOk && postOk;
  } catch (error) {
    record(`pos-api ${name} module`, false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function ensureOpenCashSession() {
  try {
    const { response, body } = await fetchJson(`${POS_API_URL}/cash/session`);
    if (response.ok && body && !body.endTime) {
      record('pos-api cash session ready', true, `session=${body.id}`);
      return true;
    }

    const started = await fetchJson(`${POS_API_URL}/cash/session/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialBalance: 100 }),
    });
    const ok = started.response.ok;
    record('pos-api cash session start', ok, `status=${started.response.status}`);
    return ok;
  } catch (error) {
    record('pos-api cash session', false, error instanceof Error ? error.message : String(error));
    return false;
  }
}

async function testPosApiModules() {
  const stamp = Date.now();
  const productId = `verify-product-${stamp}`;

  const productOk = await testPosApiModule('products', '/products', {
    id: productId,
    name: `verify-product-${stamp}`,
    price: 10,
    categories: ['Otros'],
    stock: 10,
  });

  const sessionOk = await ensureOpenCashSession();

  const salesOk = await testPosApiModule('sales', '/sales', {
    id: `verify-sale-${stamp}`,
    items: [{ id: productId, name: `verify-product-${stamp}`, price: 10, quantity: 1 }],
    total: 10,
    payments: [{ type: 'cash', amount: 10, label: 'Efectivo' }],
  });

  const [cashOk, inventoryOk] = await Promise.all([
    testPosApiModule('cash', '/cash', { description: 'verify smoke', amount: 50 }),
    testPosApiModule('inventory', '/inventory', { name: `verify-inventory-${stamp}` }),
  ]);

  return productOk && sessionOk && salesOk && cashOk && inventoryOk;
}

console.log('Verificando microservicios POS...\n');
console.log(`pos-api: ${POS_API_URL}`);
console.log(`afip:    ${AFIP_URL}\n`);

await testPosApiHealth();
await testPosApiAfipIntegration();
await testAfipConfigEndpoint();
await testPosApiModules();
await testAfipDirect();
await testAfipCredentialsImport();

const required = results.filter((item) => !item.name.includes('optional') && !item.name.includes('direct health'));
const requiredPassed = required.every((item) => item.passed);
const afipPassed = results.find((item) => item.name === 'AFIP microservice direct health')?.passed ?? false;

console.log('\nResumen');
console.log(`- pos-api + integracion: ${requiredPassed ? 'OK' : 'REVISAR'}`);
console.log(`- AFIP microservicio: ${afipPassed ? 'OK' : 'NO DISPONIBLE (normal sin Docker)'}`);

process.exit(requiredPassed ? 0 : 1);
