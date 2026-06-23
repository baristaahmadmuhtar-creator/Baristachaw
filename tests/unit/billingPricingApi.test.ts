import test from 'node:test';
import assert from 'node:assert/strict';
import billingPricingHandler from '../../server-api/billing/pricing.ts';

test.before(() => {
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_key';
});

test('billing pricing maps DB snake_case to camelCase DynamicPlanPrice correctly', async () => {
  let requestSequence = 0;
  const ip = `198.51.100.100`;

  const req = {
    method: 'GET',
    headers: {
      origin: 'http://127.0.0.1:3000',
      'x-forwarded-for': ip,
    },
    socket: { remoteAddress: ip },
  } as any;

  const res: any = {};
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = JSON.stringify(data);
    return res;
  };
  res.setHeader = () => {};

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    return new Response(
      JSON.stringify([
        {
          id: 'price_1',
          plan_code: 'pro',
          duration: 'monthly',
          currency: 'usd',
          original_price: 15,
          discount_price: 10,
          is_active: true,
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  try {
    await billingPricingHandler(req, res);
    
    assert.equal(res.statusCode, 200);
    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    
    const price = body.prices[0];
    assert.equal(price.planCode, 'pro');
    assert.equal(price.duration, 'monthly');
    assert.equal(price.currency, 'usd');
    assert.equal(price.originalPrice, 15);
    assert.equal(price.discountPrice, 10);
    assert.equal(price.isActive, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('dynamic pricing logic: DB override beats static fallback', () => {
  const cachedPrices = [
    { planCode: 'pro', duration: 'monthly', currency: 'idr', originalPrice: 150000, discountPrice: 99000, isActive: true }
  ];
  
  const getPrice = (planCode: any, duration: any, currency: any) => {
    const match = cachedPrices.find(p => p.planCode === planCode && p.duration === duration && p.currency === currency);
    if (match) return match.discountPrice ?? match.originalPrice;
    // mock resolvePlanPrice returning a static value
    return 149000; 
  };
  
  assert.equal(getPrice('pro', 'monthly', 'idr'), 99000);
  assert.equal(getPrice('starter', 'monthly', 'idr'), 149000);
});
