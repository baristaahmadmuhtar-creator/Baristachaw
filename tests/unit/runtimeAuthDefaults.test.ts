import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalRuntimeAuthDefaults,
  LOCAL_DEV_JWT_SECRET,
  LOCAL_TEST_AUTH_ENDPOINT_FLAG,
  LOCAL_TEST_AUTH_TOKEN,
} from '../../lib/test-auth/runtime-defaults.ts';

test('buildLocalRuntimeAuthDefaults injects JWT and QA auth defaults for local non-production runtime', () => {
  const source = {
    NODE_ENV: 'development',
  };

  const result = buildLocalRuntimeAuthDefaults(source, {
    isLocalRuntime: true,
    isProduction: false,
  });

  assert.deepEqual(result, {
    NODE_ENV: 'development',
    JWT_SECRET: LOCAL_DEV_JWT_SECRET,
    ENABLE_TEST_AUTH_ENDPOINT: LOCAL_TEST_AUTH_ENDPOINT_FLAG,
    TEST_AUTH_TOKEN: LOCAL_TEST_AUTH_TOKEN,
  });
  assert.deepEqual(source, { NODE_ENV: 'development' });
});

test('buildLocalRuntimeAuthDefaults preserves explicit auth env values', () => {
  const result = buildLocalRuntimeAuthDefaults(
    {
      JWT_SECRET: 'custom-secret',
      ENABLE_TEST_AUTH_ENDPOINT: '0',
      TEST_AUTH_TOKEN: 'custom-token',
    },
    {
      isLocalRuntime: true,
      isProduction: false,
    },
  );

  assert.deepEqual(result, {
    JWT_SECRET: 'custom-secret',
    ENABLE_TEST_AUTH_ENDPOINT: '0',
    TEST_AUTH_TOKEN: 'custom-token',
  });
});

test('buildLocalRuntimeAuthDefaults stays inert outside local non-production runtime', () => {
  const source = {
    NODE_ENV: 'production',
  };

  assert.deepEqual(
    buildLocalRuntimeAuthDefaults(source, {
      isLocalRuntime: false,
      isProduction: false,
    }),
    source,
  );

  assert.deepEqual(
    buildLocalRuntimeAuthDefaults(source, {
      isLocalRuntime: true,
      isProduction: true,
    }),
    source,
  );
});
