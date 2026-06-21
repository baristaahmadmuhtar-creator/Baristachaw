import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import adminPricingHandler from '../../server-api/admin/pricing.ts';

const ORIGINAL_ENV = {
  JWT_SECRET: process.env.JWT_SECRET,
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
  const ip = `198.51.100.${20 + requestSequence}`;
  return {
    method: 'GET',
    url: '/api/admin/pricing/prices',
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': ip,
      ...((overrides.headers as Record<string, string>) || {}),
    },
    ...overrides,
  } as any;
}

function createMockRes() {
  return {
    statusCode: 200,
    headers: new Map<string, string | string[]>(),
    body: '',
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers.set(name.toLowerCase(), value);
      return this;
    },
    json(payload: unknown) {
      this.body = JSON.stringify(payload);
      return this;
    },
    end(payload?: string) {
      if (typeof payload === 'string') this.body += payload;
      return this;
    },
  };
}

let mockPrices: any[] = [];
let mockPromos: any[] = [];
let originalFetch: typeof globalThis.fetch;

test.before(() => {
  process.env.JWT_SECRET = 'test_secret_for_jwt_signing';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
});

test.beforeEach(() => {
  mockPrices = [];
  mockPromos = [];
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const bodyStr = typeof init?.body === 'string' ? init.body : '{}';

    if (url.includes('/rest/v1/plan_prices')) {
      if (method === 'GET') {
        return new Response(JSON.stringify(mockPrices), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const payloadArr = JSON.parse(bodyStr);
        const payload = Array.isArray(payloadArr) ? payloadArr[0] : payloadArr;
        payload.id = 'price_' + Date.now();
        mockPrices.push(payload);
        return new Response(JSON.stringify([payload]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'PATCH') {
        const payload = JSON.parse(bodyStr);
        const match = url.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : '';
        const idx = mockPrices.findIndex(p => p.id === id);
        if (idx >= 0) mockPrices[idx] = { ...mockPrices[idx], ...payload };
        return new Response(JSON.stringify([mockPrices[idx]]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const match = url.match(/id=eq\.([^&]+)/);
        const id = match ? match[1] : '';
        mockPrices = mockPrices.filter(p => p.id !== id);
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.includes('/rest/v1/promo_codes')) {
      if (method === 'GET') {
        return new Response(JSON.stringify(mockPromos), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'POST') {
        const payloadArr = JSON.parse(bodyStr);
        const payload = Array.isArray(payloadArr) ? payloadArr[0] : payloadArr;
        payload.id = 'promo_' + Date.now();
        mockPromos.push(payload);
        return new Response(JSON.stringify([payload]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'PATCH') {
        const payload = JSON.parse(bodyStr);
        const match = url.match(/code=eq\.([^&]+)/);
        const code = match ? match[1] : '';
        const idx = mockPromos.findIndex(p => p.code === code);
        if (idx >= 0) mockPromos[idx] = { ...mockPromos[idx], ...payload };
        return new Response(JSON.stringify([mockPromos[idx]]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const match = url.match(/code=eq\.([^&]+)/);
        const code = match ? match[1] : '';
        mockPromos = mockPromos.filter(p => p.code !== code);
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.includes('/rest/v1/admin_audit_events')) {
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;
});

test.afterEach(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

test.after(() => {
  restoreEnv();
});

test('pricing admin rejects without token', async () => {
  const req = makeReq({ url: '/api/admin/pricing/prices' });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
});

test('pricing admin rejects non-admin token', async () => {
  const token = createToken({ id: 'user_123', role: 'user' });
  const req = makeReq({ url: '/api/admin/pricing/prices', headers: { authorization: `Bearer ${token}` } });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
});

test('pricing admin gets prices', async () => {
  mockPrices.push({ id: '1', plan_code: 'pro', original_price: 100 });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ url: '/api/admin/pricing/prices', headers: { authorization: `Bearer ${token}` } });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].plan_code, 'pro');
});

test('pricing admin creates price', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices', 
    method: 'POST', 
    body: { plan_code: 'starter', original_price: 50 },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.plan_code, 'starter');
  assert.equal(mockPrices.length, 1);
  assert.equal(mockPrices[0].plan_code, 'starter');
});

test('pricing admin updates price', async () => {
  mockPrices.push({ id: 'price_1', plan_code: 'pro', original_price: 100 });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices/price_1', 
    method: 'PUT', 
    body: { original_price: 150 },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(mockPrices[0].original_price, 150);
});

test('pricing admin deletes price', async () => {
  mockPrices.push({ id: 'price_1', plan_code: 'pro' });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices/price_1', 
    method: 'DELETE', 
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockPrices.length, 0);
});

test('pricing admin gets promos', async () => {
  mockPromos.push({ code: 'SAVE20', discount_amount: 20 });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ url: '/api/admin/pricing/promos', headers: { authorization: `Bearer ${token}` } });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].code, 'SAVE20');
});

test('pricing admin creates promo', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos', 
    method: 'POST', 
    body: { code: 'NEW10', discount_amount: 10 },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.code, 'NEW10');
  assert.equal(mockPromos.length, 1);
});

test('pricing admin updates promo', async () => {
  mockPromos.push({ code: 'PROMO1', discount_amount: 10 });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos/PROMO1', 
    method: 'PUT', 
    body: { discount_amount: 25 },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(mockPromos[0].discount_amount, 25);
});

test('pricing admin deletes promo', async () => {
  mockPromos.push({ code: 'PROMO1' });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos/PROMO1', 
    method: 'DELETE', 
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockPromos.length, 0);
});
