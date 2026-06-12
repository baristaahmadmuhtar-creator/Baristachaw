import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveInternalBaseUrl } from '../../server-api/ai.ts';

test('resolveInternalBaseUrl prefers APP_URL when configured', () => {
  const previousAppUrl = process.env.APP_URL;
  const previousVercelUrl = process.env.VERCEL_URL;

  process.env.APP_URL = 'https://baristachaw.example/app';
  delete process.env.VERCEL_URL;

  try {
    const result = resolveInternalBaseUrl({ headers: { host: '127.0.0.1:3000' } } as any);
    assert.equal(result, 'https://baristachaw.example');
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousVercelUrl;
  }
});

test('resolveInternalBaseUrl falls back to VERCEL_URL when APP_URL is missing', () => {
  const previousAppUrl = process.env.APP_URL;
  const previousVercelUrl = process.env.VERCEL_URL;

  delete process.env.APP_URL;
  process.env.VERCEL_URL = 'app.baristachaw.com';

  try {
    const result = resolveInternalBaseUrl({ headers: { host: '127.0.0.1:3000' } } as any);
    assert.equal(result, 'https://app.baristachaw.com');
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousVercelUrl;
  }
});

test('resolveInternalBaseUrl falls back to request host with forwarded protocol', () => {
  const previousAppUrl = process.env.APP_URL;
  const previousVercelUrl = process.env.VERCEL_URL;

  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;

  try {
    const result = resolveInternalBaseUrl({
      headers: {
        host: 'preview.baristachaw.local:3000',
        'x-forwarded-proto': 'https',
      },
    } as any);
    assert.equal(result, 'https://preview.baristachaw.local:3000');
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousVercelUrl;
  }
});

test('resolveInternalBaseUrl defaults to http for local hosts when protocol is absent', () => {
  const previousAppUrl = process.env.APP_URL;
  const previousVercelUrl = process.env.VERCEL_URL;

  delete process.env.APP_URL;
  delete process.env.VERCEL_URL;

  try {
    const result = resolveInternalBaseUrl({ headers: { host: '127.0.0.1:3000' } } as any);
    assert.equal(result, 'http://127.0.0.1:3000');
  } finally {
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousVercelUrl === undefined) delete process.env.VERCEL_URL;
    else process.env.VERCEL_URL = previousVercelUrl;
  }
});
