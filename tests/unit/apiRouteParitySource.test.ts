import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const SERVER_SOURCE = readFileSync('server.ts', 'utf8');
const CATCH_ALL_SOURCE = readFileSync('api/[...route].ts', 'utf8');
const AUTH_GATEWAY_SOURCE = readFileSync('api/auth.ts', 'utf8');
const ADMIN_GATEWAY_SOURCE = readFileSync('api/admin.ts', 'utf8');
const BILLING_GATEWAY_SOURCE = readFileSync('api/billing.ts', 'utf8');
const VERCEL_SOURCE = readFileSync('vercel.json', 'utf8');
const WEB_AUTH_CONTEXT_SOURCE = readFileSync('apps/web/src/context/AuthModalContext.tsx', 'utf8');
const LANDING_REGISTER_SOURCE = readFileSync('apps/landing/src/components/RegisterModal.tsx', 'utf8');
const ADMIN_PAGE_SOURCE = readFileSync('apps/web/src/pages/AdminManagement.tsx', 'utf8');
const ADMIN_API_SOURCE = readFileSync('apps/web/src/services/adminApi.ts', 'utf8');
const WEB_PRICING_SOURCE = readFileSync('apps/web/src/hooks/useDynamicPricing.ts', 'utf8');

const AUTH_EMAIL_PARITY_PATHS = [
  '/api/auth/email/signin',
  '/api/auth/email/signup',
  '/api/auth/email/reset',
  '/api/auth/email/update-password',
  '/api/auth/email/otp/send',
  '/api/auth/email/otp/verify',
  '/api/auth/email/password/reset/start',
  '/api/auth/email/password/reset/verify',
  '/api/auth/email/password/reset/update',
] as const;

const MOBILE_AUTH_PARITY_PATHS = [
  '/api/auth/mobile/start',
  '/api/auth/mobile/callback',
  '/api/auth/mobile/exchange',
  '/api/auth/mobile/apple/exchange',
  '/api/auth/mobile/supabase/exchange',
  '/api/auth/mobile/supabase/callback',
] as const;

function catchAllKey(path: string): string {
  return path.replace(/^\/api\//, '');
}

function authGatewayPath(path: string): string {
  return path.replace(/^\/api\/auth\//, '');
}

function assertLocalAndCatchAllRoute(path: string, handlerImportPattern: RegExp) {
  const routePattern = new RegExp(`app\\.all\\("${path.replaceAll('/', '\\/')}"`);
  assert.match(SERVER_SOURCE, routePattern, `${path} should be registered in the local Express mirror`);
  assert.match(CATCH_ALL_SOURCE, new RegExp(`'${catchAllKey(path).replaceAll('/', '\\/')}'`), `${path} should be reachable through the Vercel catch-all`);
  assert.match(CATCH_ALL_SOURCE, handlerImportPattern, `${path} should dispatch to the expected handler`);
}

test('auth routes used by app and landing are reachable in local server and Vercel catch-all', () => {
  for (const path of AUTH_EMAIL_PARITY_PATHS) {
    assert.match(AUTH_GATEWAY_SOURCE, new RegExp(authGatewayPath(path).replaceAll('/', '\\/')), `${path} should remain supported by api/auth gateway`);
    assertLocalAndCatchAllRoute(path, /server-api\/auth\/email\.js/);
  }

  for (const source of [WEB_AUTH_CONTEXT_SOURCE, LANDING_REGISTER_SOURCE]) {
    assert.match(source, /\/api\/auth\/email\/otp\/send/);
    assert.match(source, /\/api\/auth\/email\/otp\/verify/);
    assert.match(source, /\/api\/auth\/email\/password\/reset\/start/);
    assert.match(source, /\/api\/auth\/email\/password\/reset\/verify/);
    assert.match(source, /\/api\/auth\/email\/password\/reset\/update/);
  }

  assert.match(AUTH_GATEWAY_SOURCE, /path === 'account-recovery'/);
  assert.match(WEB_AUTH_CONTEXT_SOURCE, /\/api\/auth\/account-recovery/);
  assertLocalAndCatchAllRoute('/api/auth/account-recovery', /server-api\/auth\/account-recovery\.js/);
  assert.match(VERCEL_SOURCE, /"source": "\/api\/auth\/\(\.\*\)"/);
});

test('mobile auth routes used by Android and iOS stay reachable through all deployment entrypoints', () => {
  for (const path of MOBILE_AUTH_PARITY_PATHS) {
    assert.match(AUTH_GATEWAY_SOURCE, new RegExp(authGatewayPath(path).replaceAll('/', '\\/')), `${path} should remain supported by api/auth gateway`);
    assertLocalAndCatchAllRoute(path, /server-api\/auth\/mobile\/\[\.\.\.route\]\.js/);
  }

  assert.match(CATCH_ALL_SOURCE, /joined === 'auth\/mobile\/supabase\/callback'/);
  assert.match(AUTH_GATEWAY_SOURCE, /path === 'mobile\/supabase\/callback'/);
  assert.match(VERCEL_SOURCE, /"source": "\/api\/auth\/\(\.\*\)"/);
});

test('admin proof and pricing routes stay reachable across UI, local server, and serverless gateways', () => {
  assert.match(ADMIN_PAGE_SOURCE, /\/api\/admin\/proof-view\?paymentRequestId=/);
  assert.match(ADMIN_GATEWAY_SOURCE, /path === 'proof-view' \|\| path === 'proof_view'/);
  assertLocalAndCatchAllRoute('/api/admin/proof-view', /server-api\/admin\/proofView\.js/);
  assertLocalAndCatchAllRoute('/api/admin/proof_view', /server-api\/admin\/proofView\.js/);

  assert.match(ADMIN_API_SOURCE, /\/api\/admin\/pricing\/prices/);
  assert.match(ADMIN_API_SOURCE, /\/api\/admin\/pricing\/promos/);
  assert.match(SERVER_SOURCE, /app\.all\("\/api\/admin\/pricing"/);
  assert.match(SERVER_SOURCE, /app\.all\("\/api\/admin\/pricing\/\*"/);
  assert.match(CATCH_ALL_SOURCE, /segments\[0\] === 'admin' && segments\[1\] === 'pricing'/);
  assert.match(ADMIN_GATEWAY_SOURCE, /path === 'pricing' \|\| path\.startsWith\('pricing\/'\)/);
  assert.match(VERCEL_SOURCE, /"source": "\/api\/admin\/\(\.\*\)"/);
});

test('billing pricing remains public-cacheable but route-reachable in every deployment entrypoint', () => {
  assert.match(WEB_PRICING_SOURCE, /fetch\('\/api\/billing\/pricing'\)/);
  assert.match(BILLING_GATEWAY_SOURCE, /if \(path === 'pricing'\)/);
  assertLocalAndCatchAllRoute('/api/billing/pricing', /server-api\/billing\/pricing\.js/);
  assert.match(CATCH_ALL_SOURCE, /'billing\/pricing': \(\) => import\('\.\.\/server-api\/billing\/pricing\.js'\)/);
  assert.match(VERCEL_SOURCE, /"source": "\/api\/billing\/\(\.\*\)"/);
});
