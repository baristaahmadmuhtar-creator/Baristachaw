import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeFeatureFlags } from '../../server-api/admin/_featureFlags.ts';

const ORIGINAL_ENV = {
  DISABLED_FEATURES: process.env.DISABLED_FEATURES,
  APP_DISABLED_FEATURES: process.env.APP_DISABLED_FEATURES,
  MAINTENANCE_FEATURES: process.env.MAINTENANCE_FEATURES,
  APP_MAINTENANCE_FEATURES: process.env.APP_MAINTENANCE_FEATURES,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

test.beforeEach(() => {
  delete process.env.DISABLED_FEATURES;
  delete process.env.APP_DISABLED_FEATURES;
  delete process.env.MAINTENANCE_FEATURES;
  delete process.env.APP_MAINTENANCE_FEATURES;
});

test.after(() => {
  restoreEnv();
});

test('runtime feature flags accept provider aliases from env lists', () => {
  process.env.DISABLED_FEATURES = 'GEMINI';
  process.env.MAINTENANCE_FEATURES = 'openai';

  const flags = buildRuntimeFeatureFlags();
  const gemini = flags.find((flag) => flag.key === 'ai_provider_gemini');
  const openai = flags.find((flag) => flag.key === 'ai_provider_openai');

  assert.equal(gemini?.status, 'disabled');
  assert.equal(openai?.status, 'maintenance');
});
