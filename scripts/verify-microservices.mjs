#!/usr/bin/env node

const POS_API_URL = process.env.POS_API_URL ?? 'http://127.0.0.1:3001/api';
const AFIP_URL = process.env.AFIP_SERVICE_URL ?? 'http://127.0.0.1:5086';
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

async function testAfipDirect() {
  for (const testPath of AFIP_TEST_PATHS) {
    const url = `${AFIP_URL.replace(/\/$/, '')}${testPath}`;

    try {
      const { response, body } = await fetchJson(url);
      const ok = response.ok && (body?.test === 'ok' || body?.mensaje || body?.success !== undefined || typeof body === 'object');
      record('AFIP microservice direct health', ok, `${url} status=${response.status}`);
      return ok;
    } catch (error) {
      record('AFIP microservice direct health', false, `${url} — ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  record(
    'AFIP microservice direct health',
    false,
    'Levanta Docker Desktop y ejecuta: npm run dev:afip',
  );
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

async function testPosApiModules() {
  try {
    const { response, body } = await fetchJson(`${POS_API_URL}/products`);
    record('pos-api products module', response.ok, `items=${Array.isArray(body) ? body.length : 'n/a'}`);
    return response.ok;
  } catch (error) {
    record('pos-api products module', false, error instanceof Error ? error.message : String(error));
    return false;
  }
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
