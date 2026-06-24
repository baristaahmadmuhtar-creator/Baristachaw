import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSignedReadUrl } from '../../server-api/_supabaseAdmin.js';
import type { SupabaseAdminConfig } from '../../server-api/_supabaseAdmin.js';

test('createSignedReadUrl resolves relative and absolute signed URLs from Supabase variants', async () => {
  const config: Extract<SupabaseAdminConfig, { configured: true }> = {
    configured: true,
    url: 'https://test.supabase.co',
    serviceRoleKey: 'secret',
  };

  const variants = [
    { payload: { signedURL: '/object/sign/bucket/file1?token=123' }, expected: 'https://test.supabase.co/storage/v1/object/sign/bucket/file1?token=123' },
    { payload: { signedUrl: '/object/sign/bucket/file2?token=456' }, expected: 'https://test.supabase.co/storage/v1/object/sign/bucket/file2?token=456' },
    { payload: { signed_url: '/object/sign/bucket/file3?token=789' }, expected: 'https://test.supabase.co/storage/v1/object/sign/bucket/file3?token=789' },
    { payload: { url: '/object/sign/bucket/file4?token=abc' }, expected: 'https://test.supabase.co/storage/v1/object/sign/bucket/file4?token=abc' },
    { payload: { signedUrl: 'https://test.supabase.co/storage/v1/object/sign/bucket/absolute?token=xyz' }, expected: 'https://test.supabase.co/storage/v1/object/sign/bucket/absolute?token=xyz' },
  ];

  for (const variant of variants) {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      return {
        ok: true,
        text: async () => JSON.stringify(variant.payload),
      } as Response;
    };

    try {
      const result = await createSignedReadUrl(config, 'test-bucket', 'test-path', 60);
      assert.equal(result.signedUrl, variant.expected);
      assert.equal(result.path, 'test-path');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }
});
