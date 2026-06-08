import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AFIP_CONSULTA_PATH,
  AFIP_FACTURADOR_PATH,
  AFIP_TEST_PATHS,
} from './afip.types';

test('AFIP microservice uses HTTP paths with /api prefix', () => {
  assert.equal(AFIP_FACTURADOR_PATH, '/api/afipws/facturador');
  assert.equal(AFIP_CONSULTA_PATH, '/api/afipws/consulta_comprobante');
  assert.deepEqual(AFIP_TEST_PATHS, ['/api/afipws/test', '/afipws/test']);
});

test('pos-api must not embed fiscal logic modules', () => {
  const forbidden = ['pyafipws', 'flask', 'gunicorn'];
  const stack = new Error().stack ?? '';

  for (const token of forbidden) {
    assert.doesNotMatch(stack, new RegExp(token, 'i'));
  }
});
