import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeFeatureFlags } from '../../server-api/admin/_featureFlags.ts';

const ORIGINAL_ENV = {
  DISABLED_FEATURES: process.env.DISABLED_FEATURES,
  APP_DISABLED_FEATURES: process.env.APP_DISABLED_FEATURES,
  MAINTENANCE_FEATURES: process.env.MAINTENANCE_FEATURES,
  APP_MAINTENANCE_FEATURES: process.env.APP_MAINTENANCE_FEATURES,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  AI_GEMINI_API_KEY: process.env.AI_GEMINI_API_KEY,
  AI_BREW_GEMINI_API_KEY: process.env.AI_BREW_GEMINI_API_KEY,
  GOOGLE_GENAI_API_KEY: process.env.GOOGLE_GENAI_API_KEY,
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  AI_OPENAI_API_KEY: process.env.AI_OPENAI_API_KEY,
  AI_BREW_OPENAI_API_KEY: process.env.AI_BREW_OPENAI_API_KEY,
  AI_SCANNER: process.env.AI_SCANNER,
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
  delete process.env.GEMINI_API_KEY;
  delete process.env.AI_GEMINI_API_KEY;
  delete process.env.AI_BREW_GEMINI_API_KEY;
  delete process.env.GOOGLE_GENAI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_OPENAI_API_KEY;
  delete process.env.AI_BREW_OPENAI_API_KEY;
  delete process.env.AI_SCANNER;
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
