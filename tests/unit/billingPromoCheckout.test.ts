import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import checkoutHandler from '../../server-api/billing/checkout.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  MANUAL_PAYMENT_ENABLED: process.env.MANUAL_PAYMENT_ENABLED,
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

function createToken(user: Record<string, unknown>) {
  return jwt.sign({ user }, process.env.JWT_SECRET!, { expiresIn: '1h' });
}

let requestSequence = 0;

function makeReq(overrides: Record<string, unknown> = {}) {
  requestSequence += 1;
  const ip = `198.51.100.${30 + requestSequence}`;
  const baseHeaders = {
    origin: 'http://127.0.0.1:3000',
    'x-forwarded-for': ip,
  };
  return {
    method: 'POST',
    query: {},
    body: {},
    headers: baseHeaders,
    cookies: {},
    socket: {
      remoteAddress: ip,
    },
    ...overrides,
  };
}

function makeRes() {
  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = JSON.stringify(data);
    return res;
  };
  res.send = (data: any) => {
    res.body = data;
    return res;
  };
  res.setHeader = (key: string, val: string) => {
    if (!res.headers) res.headers = {};
    res.headers[key] = val;
  };
  return res;
}

async function postCheckout(userId: string, body: any, planCode: string = 'free', currentPlanCode: string = 'free') {
  const token = createToken({
    id: userId,
    email: `${userId}@example.com`,
    planCode: currentPlanCode,
  });
  const req = makeReq({
    body,
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': `198.51.100.${30 + requestSequence}`,
      authorization: `Bearer ${token}`,
    },
  });
  const res = makeRes();
  await checkoutHandler(req as any, res as any);
  return { res, body: JSON.parse(res.body), token };
}

let originalFetch: typeof fetch | undefined;

test.beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.SUPABASE_JWT_SECRET = 'test-secret';
  process.env.MANUAL_PAYMENT_ENABLED = 'true';
  process.env.SUPABASE_URL = 'https://unit-test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy-service-role-key';

  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    console.log('[FETCH_MOCK]', url);
    
    if (url.includes('/rest/v1/plan_prices')) {
      // Mock plan prices
      if (url.includes('plan_code=eq.starter')) {
        return new Response(JSON.stringify([{
          plan_code: 'starter',
          duration: 'quarterly',
          currency: 'IDR',
          original_price: 700000,
          discount_price: 600000,
          is_active: true
        }]), { status: 200 });
      }
      if (url.includes('plan_code=eq.pro')) {
        return new Response(JSON.stringify([{
          plan_code: 'pro',
          duration: 'quarterly',
          currency: 'IDR',
          original_price: 1500000,
          discount_price: 1000000,
          is_active: true
        }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }

    if (url.includes('/rest/v1/promo_codes')) {
      if (url.includes('code=eq.DISKON10')) {
        return new Response(JSON.stringify([{
          code: 'DISKON10',
          discount_type: 'percentage',
          discount_value: 10,
          valid_plan_codes: null,
          valid_durations: null,
          valid_until: '2099-01-01T00:00:00.000Z',
          max_uses: null,
          current_uses: 0,
          is_active: true
        }]), { status: 200 });
      }
      if (url.includes('code=eq.UPGRADE10')) {
        return new Response(JSON.stringify([{
          code: 'UPGRADE10',
          discount_type: 'percentage',
          discount_value: 10,
          valid_plan_codes: null,
          valid_durations: null,
          valid_until: '2099-01-01T00:00:00.000Z',
          max_uses: null,
          current_uses: 0,
          is_active: true
        }]), { status: 200 });
      }
      if (url.includes('code=eq.EXPIREDPROMO')) {
        return new Response(JSON.stringify([{
          code: 'EXPIREDPROMO',
          discount_type: 'percentage',
          discount_value: 50,
          valid_plan_codes: null,
          valid_durations: null,
          valid_until: '2020-01-01T00:00:00.000Z', // Expired
          max_uses: null,
          current_uses: 0,
          is_active: true
        }]), { status: 200 });
      }
      if (url.includes('code=eq.ONLYSTARTER')) {
        return new Response(JSON.stringify([{
          code: 'ONLYSTARTER',
          discount_type: 'fixed_amount',
          discount_value: 50000,
          valid_plan_codes: ['starter'], // Only for starter
          valid_durations: null,
          valid_until: '2099-01-01T00:00:00.000Z',
          max_uses: null,
          current_uses: 0,
          is_active: true
        }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }

    if (url.includes('/rest/v1/app_users')) {
      if (url.includes('user_upgrade')) {
        return new Response(JSON.stringify([{
          id: 'user_upgrade',
          plan_code: 'starter',
          status: 'active',
          billing_provider: 'manual',
          billing_status: 'active'
        }]), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: 'default', plan_code: 'free', status: 'active', billing_provider: 'none', billing_status: 'none' }]), { status: 200 });
    }

    if (url.includes('/rest/v1/user_entitlements')) {
       if (url.includes('user_upgrade')) {
          return new Response(JSON.stringify([{
            user_id: 'user_upgrade',
            plan_code: 'starter',
            status: 'active',
            source: 'manual',
            payment_action_required: false
          }]), { status: 200 });
       }
       return new Response(JSON.stringify([]), { status: 200 });
    }

    if (url.includes('/rest/v1/manual_payment_methods')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    if (url.includes('/rest/v1/admin_audit_events')) {
      return new Response(JSON.stringify([]), { status: 200 });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

test.afterEach(() => {
  restoreEnv();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

test('1. Normal Promo (No Upgrade) - 10% Discount on Starter', async () => {
  const { res, body } = await postCheckout('user_normal', {
    planCode: 'starter',
    duration: 'quarterly',
    promoCode: 'DISKON10'
  }, 'starter', 'free');

  assert.equal(res.statusCode, 200);
  assert.equal(body.planCode, 'starter');
  // Starter discount_price is 600000
  // 10% discount = 60000
  // Final amount should be 540000
  assert.equal(body.manualInvoice.amount, 540000);
});

test('2. Upgrade Math - Upgrade from Starter to Pro with 10% Promo', async () => {
  const { res, body } = await postCheckout('user_upgrade', {
    planCode: 'pro',
    duration: 'quarterly',
    promoCode: 'UPGRADE10'
  }, 'pro', 'starter');

  assert.equal(res.statusCode, 200);
  // Pro discount_price is 1000000. Starter discount_price is 600000.
  // Math: 1000000 - 600000 = 400000 (upgrade delta)
  // 10% discount = 40000
  // Final amount should be 360000
  assert.equal(body.manualInvoice.amount, 360000);
});

test('3. Expired Promo Code - Should fail with 400', async () => {
  const { res, body } = await postCheckout('user_expired', {
    planCode: 'starter',
    duration: 'quarterly',
    promoCode: 'EXPIREDPROMO'
  }, 'starter', 'free');

  assert.equal(res.statusCode, 400);
  assert.equal(body.ok, false);
  assert.match(body.error, /invalid, expired, or not applicable/i);
});

test('4. Invalid Plan Promo Code - Should fail with 400', async () => {
  // ONLYSTARTER is only for starter, but user wants 'pro'
  const { res, body } = await postCheckout('user_wrong_plan', {
    planCode: 'pro',
    duration: 'quarterly',
    promoCode: 'ONLYSTARTER'
  }, 'pro', 'free');

  assert.equal(res.statusCode, 400);
  assert.equal(body.ok, false);
  assert.match(body.error, /invalid, expired, or not applicable/i);
});
