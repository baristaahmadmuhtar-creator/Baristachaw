import { runSmoke } from './smoke-runner.mjs';

const baseUrl = process.env.BASE_URL || 'https://app.baristachaw.com';
const deepHealthToken = process.env.HEALTHCHECK_TOKEN || '';
const bearerToken = process.env.PROD_SMOKE_BEARER_TOKEN || process.env.SMOKE_BEARER_TOKEN || '';
const email = process.env.PROD_SMOKE_EMAIL || process.env.SMOKE_EMAIL || '';
const password = process.env.PROD_SMOKE_PASSWORD || process.env.SMOKE_PASSWORD || '';
const samples = process.env.PROD_SMOKE_SAMPLES || '15';
const p95FastMs = process.env.PROD_SMOKE_P95_FAST_MS || '2000';
const p95NormalMs = process.env.PROD_SMOKE_P95_NORMAL_MS || '4000';
const p95DeepMs = process.env.PROD_SMOKE_P95_DEEP_MS || '8000';
const aiDelayMs = process.env.PROD_SMOKE_AI_DELAY_MS || '2200';
const requireAuthenticatedChecks = process.argv.includes('--require-auth')
  || process.env.PROD_SMOKE_REQUIRE_AUTH === '1';

runSmoke({
  baseUrl,
  label: 'production',
  deepHealthToken: deepHealthToken || undefined,
  bearerToken: bearerToken || undefined,
  email: email || undefined,
  password: password || undefined,
  samples,
  p95FastMs,
  p95NormalMs,
  p95DeepMs,
  aiDelayMs,
  expectTestAuthDisabled: true,
  requireAuthenticatedChecks,
}).catch(error => {
  console.error('[smoke:prod] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
