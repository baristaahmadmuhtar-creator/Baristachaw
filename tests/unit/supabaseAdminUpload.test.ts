import test from 'node:test';
import assert from 'node:assert/strict';
import { createSignedUploadUrl } from '../../server-api/_supabaseAdmin.ts';

test('createSignedUploadUrl sends a non-empty JSON body so Supabase Storage does not reject the request', async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody: string | undefined;
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = typeof init?.body === 'string' ? init.body : undefined;
    return new Response(JSON.stringify({ url: '/mock-upload-path' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const result = await createSignedUploadUrl(
      { configured: true, url: 'https://unit-test.supabase.co', serviceRoleKey: 'dummy-service-role-key' },
      'payment-proofs',
      'user_1/proof.png',
    );
    assert.ok(capturedBody, 'expected a request body to be sent');
    assert.doesNotThrow(() => JSON.parse(capturedBody!));
    assert.equal(result.signedUrl, 'https://unit-test.supabase.co/storage/v1/mock-upload-path');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
