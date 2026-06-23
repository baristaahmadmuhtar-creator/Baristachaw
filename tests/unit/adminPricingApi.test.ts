import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import adminPricingHandler from '../../server-api/admin/pricing.ts';
import adminGatewayHandler from '../../api/admin.ts';
import catchAllGatewayHandler from '../../api/[...route].ts';

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
let mockAuditEvents: any[] = [];
let originalFetch: typeof globalThis.fetch;

test.before(() => {
  process.env.JWT_SECRET = 'test_secret_for_jwt_signing';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
});

test.beforeEach(() => {
  mockPrices = [];
  mockPromos = [];
  mockAuditEvents = [];
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
        const id = match ? decodeURIComponent(match[1]) : '';
        const idx = mockPrices.findIndex(p => p.id === id);
        if (idx >= 0) mockPrices[idx] = { ...mockPrices[idx], ...payload };
        return new Response(JSON.stringify([mockPrices[idx]]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const match = url.match(/id=eq\.([^&]+)/);
        const id = match ? decodeURIComponent(match[1]) : '';
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
        const code = match ? decodeURIComponent(match[1]) : '';
        const idx = mockPromos.findIndex(p => p.code === code);
        if (idx >= 0) mockPromos[idx] = { ...mockPromos[idx], ...payload };
        return new Response(JSON.stringify([mockPromos[idx]]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (method === 'DELETE') {
        const match = url.match(/code=eq\.([^&]+)/);
        const code = match ? decodeURIComponent(match[1]) : '';
        mockPromos = mockPromos.filter(p => p.code !== code);
        return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.includes('/rest/v1/admin_audit_events')) {
      if (method === 'POST') {
        const payloadArr = JSON.parse(bodyStr);
        const payload = Array.isArray(payloadArr) ? payloadArr[0] : payloadArr;
        mockAuditEvents.push(payload);
        return new Response(JSON.stringify([payload]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
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

test('pricing admin is reachable through api/admin gateway', async () => {
  const req = makeReq({
    query: { path: 'pricing/prices' },
    url: '/api/admin?path=pricing/prices',
  });
  const res = createMockRes();
  await adminGatewayHandler(req, res as any);
  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'auth_required');
});

test('pricing admin is reachable through catch-all gateway', async () => {
  const req = makeReq({
    query: { route: ['admin', 'pricing', 'prices'] },
    url: '/api/admin/pricing/prices',
  });
  const res = createMockRes();
  await catchAllGatewayHandler(req, res as any);
  assert.equal(res.statusCode, 401);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, false);
  assert.equal(body.errorCode, 'auth_required');
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
  mockPrices.push({ id: '1', plan_code: 'pro', duration: 'monthly', currency: 'idr', original_price: 100, discount_price: 80, is_active: true });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ url: '/api/admin/pricing/prices', headers: { authorization: `Bearer ${token}` } });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 1);
  assert.deepEqual(body.data[0], {
    id: '1',
    planCode: 'pro',
    duration: 'monthly',
    currency: 'idr',
    originalPrice: 100,
    discountPrice: 80,
    isActive: true,
  });
});

test('pricing admin creates price', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices', 
    method: 'POST', 
    body: {
      planCode: 'starter',
      duration: 'monthly',
      currency: 'idr',
      originalPrice: 50,
      discountPrice: 40,
      isActive: true,
      operatorNote: 'Operator reason: launch monthly starter price.',
    },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.planCode, 'starter');
  assert.equal(mockPrices.length, 1);
  assert.equal(mockPrices[0].plan_code, 'starter');
  assert.equal(mockPrices[0].discount_price, 40);
});

test('pricing admin updates price', async () => {
  mockPrices.push({ id: 'price_1', plan_code: 'pro', duration: 'monthly', currency: 'idr', original_price: 100, discount_price: 90, is_active: true });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices/price_1', 
    method: 'PUT', 
    body: { originalPrice: 150, operatorNote: 'Operator reason: update pro launch price.' },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(mockPrices[0].original_price, 150);
  assert.equal(body.data.originalPrice, 150);
});

test('pricing admin deletes price', async () => {
  mockPrices.push({ id: 'price_1', plan_code: 'pro' });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices/price_1', 
    method: 'DELETE', 
    body: { operatorNote: 'Operator reason: remove obsolete pro launch price.' },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockPrices.length, 0);
});

test('pricing admin gets promos', async () => {
  mockPromos.push({ code: 'SAVE20', discount_type: 'percentage', discount_value: 20, max_uses: 100, current_uses: 1, is_active: true });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ url: '/api/admin/pricing/promos', headers: { authorization: `Bearer ${token}` } });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.length, 1);
  assert.equal(body.data[0].code, 'SAVE20');
  assert.equal(body.data[0].discountType, 'percentage');
  assert.equal(body.data[0].discountValue, 20);
});

test('pricing admin creates promo', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos', 
    method: 'POST', 
    body: {
      code: 'NEW10',
      discountType: 'percentage',
      discountValue: 10,
      maxUses: 100,
      isActive: true,
      operatorNote: 'Operator reason: add launch promo code.',
    },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(body.data.code, 'NEW10');
  assert.equal(mockPromos.length, 1);
  assert.equal(mockPromos[0].discount_type, 'percentage');
  assert.equal(mockPromos[0].discount_value, 10);
});

test('pricing admin updates promo', async () => {
  mockPromos.push({ code: 'PROMO1', discount_type: 'percentage', discount_value: 10, current_uses: 0, is_active: true });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos/PROMO1', 
    method: 'PUT', 
    body: { discountValue: 25, operatorNote: 'Operator reason: update promo value.' },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.ok, true);
  assert.equal(mockPromos[0].discount_value, 25);
  assert.equal(body.data.discountValue, 25);
});

test('pricing admin deletes promo', async () => {
  mockPromos.push({ code: 'PROMO1' });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/promos/PROMO1', 
    method: 'DELETE', 
    body: { operatorNote: 'Operator reason: retire launch promo.' },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockPromos.length, 0);
});

test('pricing admin rejects writes without operator note', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({
    url: '/api/admin/pricing/prices',
    method: 'POST',
    body: {
      planCode: 'starter',
      duration: 'monthly',
      currency: 'idr',
      originalPrice: 50,
    },
    headers: { authorization: `Bearer ${token}` },
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'operator_reason_required');
});

test('pricing admin rejects cross-site writes with bad origin', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({
    url: '/api/admin/pricing/prices',
    method: 'POST',
    body: {
      planCode: 'starter',
      duration: 'monthly',
      currency: 'idr',
      originalPrice: 50,
      operatorNote: 'Operator reason: valid note.',
    },
    headers: { 
      authorization: `Bearer ${token}`,
      origin: 'https://evil.com',
    },
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 403);
  const body = JSON.parse(res.body);
  assert.equal(body.errorCode, 'csrf_origin_denied');
});

test('pricing admin handles URL-encoded IDs and promo codes properly', async () => {
  mockPromos.push({ code: 'HOLIDAY24', discount_type: 'percentage', discount_value: 10, is_active: true });
  const token = createToken({ id: 'admin_123', role: 'admin' });
  
  // URL encode the plus sign
  const encodedCode = encodeURIComponent('HOLIDAY+24');
  
  const req = makeReq({ 
    url: `/api/admin/pricing/promos/${encodedCode}`, 
    method: 'PUT', 
    body: { discountValue: 20, operatorNote: 'Operator reason: update holiday promo.' },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(mockPromos[0].discount_value, 20);
});

test('pricing admin writes to audit log with correct payload', async () => {
  const token = createToken({ id: 'admin_123', role: 'admin' });
  const req = makeReq({ 
    url: '/api/admin/pricing/prices', 
    method: 'POST', 
    body: {
      planCode: 'pro',
      duration: 'monthly',
      currency: 'usd',
      originalPrice: 15,
      operatorNote: 'Operator reason: adding test price for audit.',
    },
    headers: { authorization: `Bearer ${token}` } 
  });
  const res = createMockRes();
  await adminPricingHandler(req, res);
  assert.equal(res.statusCode, 200);
  
  assert.equal(mockAuditEvents.length, 1);
  const event = mockAuditEvents[0];
  assert.equal(event.actor_user_id, 'admin_123');
  assert.equal(event.action, 'create_plan_price');
  assert.ok(event.detail.includes('Operator reason: adding test price for audit.'));
  assert.equal(event.after.duration, 'monthly');
  assert.equal(event.after.currency, 'usd');
});
