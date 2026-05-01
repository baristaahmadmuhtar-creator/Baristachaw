import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyProviderError } from '../../server-api/_shared.ts';

test('classifyProviderError maps billing and insufficient balance failures to quota_exceeded', () => {
  const billing = classifyProviderError(new Error('HTTP 402 billing_not_active: account is not active'), 'OPENAI');
  assert.equal(billing.code, 'quota_exceeded');
  assert.equal(billing.statusCode, 429);
  assert.equal(billing.retryable, true);
  assert.equal(billing.provider, 'OPENAI');

  const balance = classifyProviderError(new Error('status 402 insufficient balance'), 'DEEPSEEK');
  assert.equal(balance.code, 'quota_exceeded');
  assert.equal(balance.statusCode, 429);
  assert.equal(balance.retryable, true);
  assert.equal(balance.provider, 'DEEPSEEK');
});

test('classifyProviderError maps missing provider models to unsupported_model', () => {
  const error = classifyProviderError(new Error('HTTP 404 model gemini-2.5-flash-lite-latest not found'), 'GEMINI');
  assert.equal(error.code, 'unsupported_model');
  assert.equal(error.statusCode, 400);
  assert.equal(error.retryable, false);
  assert.equal(error.provider, 'GEMINI');
});
