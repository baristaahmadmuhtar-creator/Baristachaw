import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mayarHandler from '../../server-api/payment/mayar.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ORIGINAL_ENV = {
  MAYAR_API_KEY: process.env.MAYAR_API_KEY,
  MAYAR_PAYMENT_ENABLED: process.env.MAYAR_PAYMENT_ENABLED,
  APP_URL: process.env.APP_URL,
  JWT_SECRET: process.env.JWT_SECRET,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (typeof value === 'string') process.env[key] = value;
    else delete process.env[key];
  }
}

let authCounter = 0;

function authHeader() {
  authCounter += 1;
  const token = jwt.sign(
    { user: { id: `mayar-user-${authCounter}`, email: `test-${authCounter}@example.com` } },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
  return `Bearer ${token}`;
}

function makeReq(bodyObj: Record<string, unknown>, method: string = 'POST'): IncomingMessage {
  const req: any = {
    method,
    headers: {
      'content-type': 'application/json',
      origin: 'http://127.0.0.1:3000',
      host: '127.0.0.1:3000',
      'x-forwarded-proto': 'http',
      authorization: authHeader(),
    },
  };
  
  const bodyStr = JSON.stringify(bodyObj);
  let ended = false;
  
  req.on = (event: string, callback: (arg?: any) => void) => {
    if (event === 'data' && !ended) {
      callback(Buffer.from(bodyStr));
    }
    if (event === 'end' && !ended) {
      ended = true;
      callback();
    }
  };
  
  return req as IncomingMessage;
}

function makeRes(): any {
  const res: any = {
    headers: {},
    statusCode: 200,
    body: '',
  };
  
  res.setHeader = (key: string, val: string) => {
    res.headers[key.toLowerCase()] = val;
  };
  
  res.writeHead = (status: number, headers?: Record<string, string>) => {
    res.statusCode = status;
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        res.setHeader(k, v);
      }
    }
  };
  
  res.end = (data: string) => {
    if (data) res.body += data;
  };

  res.status = (status: number) => {
    res.statusCode = status;
    return res;
  };

  res.json = (data: unknown) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return res;
  };
  
  return res;
}

let originalFetch: typeof fetch | undefined;

test.beforeEach(() => {
  process.env.MAYAR_API_KEY = 'test-mayar-key';
  process.env.MAYAR_PAYMENT_ENABLED = '1';
  process.env.APP_URL = 'http://127.0.0.1:3000';
  process.env.JWT_SECRET = 'unit-test-secret-32-chars-minimum';

  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    
    if (url.includes('/payment')) {
      const body = JSON.parse(init?.body as string);
      
      // Simulate Mayar error
      if (body.customer?.email === 'error@example.com') {
        return new Response('Invalid amount', { status: 400 });
      }
      
      return new Response(JSON.stringify({
        data: {
          id: 'pay_123',
          link: `https://mayar.id/pay/123?amount=${body.amount}`
        }
      }), { status: 200 });
    }
    
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;
});

test.afterEach(() => {
  restoreEnv();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

test('Mayar Payment - Disabled by default unless legacy flag is enabled', async () => {
  delete process.env.MAYAR_PAYMENT_ENABLED;
  const req = makeReq({
    plan: 'starter',
    duration: 'monthly',
    email: 'test@example.com',
    name: 'Test User',
    currency: 'idr'
  });
  const res = makeRes();

  await mayarHandler(req, res);

  assert.equal(res.statusCode, 503);
  const data = JSON.parse(res.body);
  assert.equal(data.errorCode, 'payment_legacy_disabled');
});

test('Mayar Payment - Returns checkout URL for valid IDR request', async () => {
  const req = makeReq({
    plan: 'starter',
    duration: 'monthly',
    email: 'test@example.com',
    name: 'Test User',
    currency: 'idr'
  });
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.invoiceId, 'pay_123');
  assert.match(data.checkoutUrl, /https:\/\/mayar\.id\/pay\/123/);
});

test('Mayar Payment - Returns checkout URL for valid USD request (cents conversion)', async () => {
  const req = makeReq({
    plan: 'pro',
    duration: 'yearly',
    email: 'usd@example.com',
    name: 'USD User',
    currency: 'usd'
  });
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  // Pro Yearly USD is 59.99 -> Math.round(59.99 * 100) = 5999
  assert.match(data.checkoutUrl, /amount=5999/);
});

test('Mayar Payment - Fails if plan is invalid', async () => {
  const req = makeReq({
    plan: 'enterprise',
    duration: 'monthly',
    email: 'test@example.com',
    name: 'Test',
    currency: 'idr'
  });
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.match(data.error, /Invalid plan/);
});

test('Mayar Payment - Fails if duration is invalid', async () => {
  const req = makeReq({
    plan: 'pro',
    duration: 'weekly',
    email: 'test@example.com',
    name: 'Test',
    currency: 'idr'
  });
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 400);
  const data = JSON.parse(res.body);
  assert.match(data.error, /Invalid duration/);
});

test('Mayar Payment - Handles Mayar API errors gracefully', async () => {
  const req = makeReq({
    plan: 'starter',
    duration: 'monthly',
    email: 'error@example.com',
    name: 'Error User',
    currency: 'idr'
  });
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 502);
  const data = JSON.parse(res.body);
  assert.match(data.error, /Payment gateway error/);
});

test('Mayar Payment - OPTIONS request returns 204', async () => {
  const req = makeReq({}, 'OPTIONS');
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 204);
  assert.equal(res.body, '');
});

test('Mayar Payment - Non-POST/OPTIONS request returns 405', async () => {
  const req = makeReq({}, 'GET');
  const res = makeRes();
  
  await mayarHandler(req, res);
  
  assert.equal(res.statusCode, 405);
});
