import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PLAN_SOURCE = readFileSync('apps/web/src/components/billing/PlanGrowthSurface.tsx', 'utf8');

test('paid home plan surface is useful benefits UI, not duplicate workspace status copy', () => {
  assert.match(PLAN_SOURCE, /compactPaidTitle/);
  assert.match(PLAN_SOURCE, /compactPaidBenefitLine/);
  assert.match(PLAN_SOURCE, /Manfaat Pro|Pro benefits/);
  assert.doesNotMatch(PLAN_SOURCE, /t\.homePlanPaidTitle\.replace/);
  assert.doesNotMatch(PLAN_SOURCE, /t\.homePlanPaidProof/);
});
