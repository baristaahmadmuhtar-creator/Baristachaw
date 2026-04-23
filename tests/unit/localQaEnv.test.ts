import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLocalQaEnv, normalizeLoopbackBaseUrl } from '../../scripts/local-qa-env.mjs';

test('normalizeLoopbackBaseUrl rewrites localhost origins to 127.0.0.1', () => {
  assert.equal(normalizeLoopbackBaseUrl('http://localhost:3000'), 'http://127.0.0.1:3000');
  assert.equal(normalizeLoopbackBaseUrl('https://localhost:4443'), 'https://127.0.0.1:4443');
});

test('buildLocalQaEnv injects local QA defaults without mutating the source env', () => {
  const source = {
    NODE_ENV: 'development',
  };

  const result = buildLocalQaEnv(source, 'http://localhost:3000');

  assert.deepEqual(result, {
    NODE_ENV: 'development',
    BASE_URL: 'http://127.0.0.1:3000',
    ENABLE_TEST_AUTH_ENDPOINT: '1',
    TEST_AUTH_TOKEN: 'local-test-token',
    QA_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
    APP_URL: 'http://127.0.0.1:3000',
  });
  assert.deepEqual(source, { NODE_ENV: 'development' });
});

test('buildLocalQaEnv preserves explicit auth and origin settings', () => {
  const result = buildLocalQaEnv({
    BASE_URL: 'https://preview.example',
    ENABLE_TEST_AUTH_ENDPOINT: '0',
    TEST_AUTH_TOKEN: 'custom-token',
    QA_ALLOWED_ORIGINS: 'https://preview.example',
    APP_URL: 'https://preview.example',
  }, 'http://127.0.0.1:3000');

  assert.deepEqual(result, {
    BASE_URL: 'https://preview.example',
    ENABLE_TEST_AUTH_ENDPOINT: '0',
    TEST_AUTH_TOKEN: 'custom-token',
    QA_ALLOWED_ORIGINS: 'https://preview.example',
    APP_URL: 'https://preview.example',
  });
});
