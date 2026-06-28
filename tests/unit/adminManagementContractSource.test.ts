import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ADMIN_API_SOURCE = readFileSync('apps/web/src/services/adminApi.ts', 'utf8');
const ADMIN_PAGE_SOURCE = readFileSync('apps/web/src/pages/AdminManagement.tsx', 'utf8');

test('admin client plan patch exposes feature limit updates typed end-to-end', () => {
  assert.match(ADMIN_API_SOURCE, /export type AdminPlanPatch = Partial<\{[\s\S]*featureLimits:\s*Record<string,\s*\{\s*daily:\s*number;\s*monthly:\s*number\s*\}>;/);
  assert.doesNotMatch(ADMIN_PAGE_SOURCE, /\(patch as any\)\.featureLimits = computedLimits;/);
  assert.match(ADMIN_PAGE_SOURCE, /patch\.featureLimits = computedLimits;/);
});

test('admin queue tab uses billing manual queue counts and never maps to plans section', () => {
  assert.match(ADMIN_PAGE_SOURCE, /if \(tab === 'queues'\) return 'billing';/);
  assert.doesNotMatch(ADMIN_PAGE_SOURCE, /if \(tab === 'queues'\) return 'plans';/);
  assert.doesNotMatch(ADMIN_PAGE_SOURCE, /metrics\.manualQueueCounts/);
  assert.match(ADMIN_PAGE_SOURCE, /snapshot\?\.billing\.manualQueueCounts\?\.pending_review/);
  assert.match(ADMIN_PAGE_SOURCE, /snapshot\?\.billing\.manualQueueCounts\?\.receipt_received/);

  const metricsBlock = ADMIN_API_SOURCE.match(/metrics: \{([\s\S]*?)\n  \};\n  plans:/)?.[1] || '';
  assert.doesNotMatch(metricsBlock, /manualQueueCounts/);
});
