import { runSmoke } from './smoke-runner.mjs';

const baseUrl = process.env.BASE_URL || 'https://baristaclaw.vercel.app';
const deepHealthToken = process.env.HEALTHCHECK_TOKEN || '';
const bearerToken = process.env.PROD_SMOKE_BEARER_TOKEN || process.env.SMOKE_BEARER_TOKEN || '';
const samples = process.env.PROD_SMOKE_SAMPLES || '15';
const p95FastMs = process.env.PROD_SMOKE_P95_FAST_MS || '2000';
const p95NormalMs = process.env.PROD_SMOKE_P95_NORMAL_MS || '4000';
const p95DeepMs = process.env.PROD_SMOKE_P95_DEEP_MS || '8000';
const aiDelayMs = process.env.PROD_SMOKE_AI_DELAY_MS || '2200';

runSmoke({
  baseUrl,
  label: 'production',
  deepHealthToken: deepHealthToken || undefined,
  bearerToken: bearerToken || undefined,
  samples,
  p95FastMs,
  p95NormalMs,
  p95DeepMs,
  aiDelayMs,
  expectTestAuthDisabled: true,
}).catch(error => {
  console.error('[smoke:prod] failed:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
