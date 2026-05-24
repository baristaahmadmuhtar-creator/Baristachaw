import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveServerAiTimeoutMs,
  resolveServerChatTimeoutMs,
} from '../../apps/web/src/services/gemini.ts';
import { resolveMobileAiActionTimeoutMs } from '../../apps/mobile/src/services/apiClient.ts';

test('web AI client uses mode-aware timeouts long enough for deep think', () => {
  const fast = resolveServerAiTimeoutMs('fast');
  const normal = resolveServerAiTimeoutMs('balanced');
  const deep = resolveServerAiTimeoutMs('deep_think');

  assert.ok(fast >= 40_000);
  assert.ok(normal > fast);
  assert.ok(deep >= 120_000);
  assert.ok(deep > normal);
  assert.ok(resolveServerAiTimeoutMs('analyze_attachment') >= 70_000);
  assert.ok(resolveServerChatTimeoutMs() >= 45_000);
});

test('mobile AI client mirrors deep-friendly action timeouts', () => {
  const fast = resolveMobileAiActionTimeoutMs('fast');
  const normal = resolveMobileAiActionTimeoutMs('balanced');
  const deep = resolveMobileAiActionTimeoutMs('deep_think');

  assert.ok(fast >= 40_000);
  assert.ok(normal > fast);
  assert.ok(deep >= 120_000);
  assert.ok(deep > normal);
  assert.ok(resolveMobileAiActionTimeoutMs('analyze_attachment') >= 70_000);
});

test('explicit client timeout overrides are clamped to a safe minimum', () => {
  assert.equal(resolveServerAiTimeoutMs('deep_think', 1), 2_000);
  assert.equal(resolveServerAiTimeoutMs('deep_think', 12_345), 12_345);
  assert.equal(resolveMobileAiActionTimeoutMs('deep_think', 1), 2_000);
  assert.equal(resolveMobileAiActionTimeoutMs('deep_think', 12_345), 12_345);
});
