import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGeminiInlineContents,
  estimateBase64DecodedBytes,
  INLINE_ATTACHMENT_MAX_BASE64_CHARS,
  normalizeInlineAttachmentPayload,
  resolveGeminiVisionModel,
} from '../../server-api/ai.ts';

test('normalizeInlineAttachmentPayload strips data URLs and keeps mimeType', () => {
  const result = normalizeInlineAttachmentPayload('data:image/png;base64,SGVsbG8=', undefined, {
    expectedMimePrefix: 'image/',
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.payload.mimeType, 'image/png');
  assert.equal(result.ok && result.payload.data, 'SGVsbG8=');
  assert.equal(result.ok && result.payload.byteLength, 5);
  assert.equal(result.ok && result.payload.source, 'data_url');
});

test('normalizeInlineAttachmentPayload rejects inline payloads above Vercel-safe cap', () => {
  const oversized = 'A'.repeat(INLINE_ATTACHMENT_MAX_BASE64_CHARS + 4);
  const result = normalizeInlineAttachmentPayload(oversized, 'image/jpeg', {
    expectedMimePrefix: 'image/',
  });

  assert.equal(result.ok, false);
  assert.equal(result.ok === false && result.statusCode, 413);
});

test('buildGeminiInlineContents formats multimodal prompt as text plus inlineData parts', () => {
  const normalized = normalizeInlineAttachmentPayload('SGVsbG8=', 'image/jpeg', {
    expectedMimePrefix: 'image/',
  });
  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  const contents = buildGeminiInlineContents('Caption this image.', normalized.payload);
  assert.equal(contents[0].role, 'user');
  assert.deepEqual(contents[0].parts[0], { text: 'Caption this image.' });
  assert.deepEqual(contents[0].parts[1], {
    inlineData: { mimeType: 'image/jpeg', data: 'SGVsbG8=' },
  });
});

test('resolveGeminiVisionModel ignores unsupported requested models', () => {
  const previous = process.env.GEMINI_VISION_MODEL;
  delete process.env.GEMINI_VISION_MODEL;
  try {
    assert.equal(resolveGeminiVisionModel('gemini-2.5-flash'), 'gemini-2.5-flash');
    assert.equal(resolveGeminiVisionModel('text-only-provider'), 'gemini-2.5-flash');
    assert.equal(estimateBase64DecodedBytes('SGVsbG8='), 5);
  } finally {
    if (typeof previous === 'string') process.env.GEMINI_VISION_MODEL = previous;
  }
});
