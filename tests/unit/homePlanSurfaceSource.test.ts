import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const PLAN_SOURCE = readFileSync('apps/web/src/components/billing/PlanGrowthSurface.tsx', 'utf8');
const HOME_SOURCE = readFileSync('apps/web/src/pages/Home.tsx', 'utf8');
const WORKSPACE_STATUS_SOURCE = readFileSync('apps/web/src/utils/workspaceStatus.ts', 'utf8');

test('paid home plan surface is useful benefits UI, not duplicate workspace status copy', () => {
  assert.match(PLAN_SOURCE, /compactPaidTitle/);
  assert.match(PLAN_SOURCE, /compactPaidBenefitLine/);
  assert.match(PLAN_SOURCE, /Manfaat Pro|Pro benefits/);
  assert.doesNotMatch(PLAN_SOURCE, /t\.homePlanPaidTitle\.replace/);
  assert.doesNotMatch(PLAN_SOURCE, /t\.homePlanPaidProof/);
});

test('home premium workflow uses one compact billing surface per account state', () => {
  assert.match(HOME_SOURCE, /const shouldShowPlanGrowthSurface/);
  assert.match(HOME_SOURCE, /workspaceStatus\.kind !== 'free'/);
  assert.match(HOME_SOURCE, /workspaceStatus\.kind !== 'pending_review'/);
  assert.doesNotMatch(HOME_SOURCE, /isAuthenticated && accountSnapshot && !hasPendingPaymentReview \?/);
});

test('manual payment status can leave review state after approval', () => {
  const manualReviewSource = WORKSPACE_STATUS_SOURCE.slice(
    WORKSPACE_STATUS_SOURCE.indexOf('function isManualReview'),
    WORKSPACE_STATUS_SOURCE.indexOf('export function resolveWorkspaceStatus'),
  );

  assert.match(manualReviewSource, /snapshot\.billing\.status === 'active'/);
  assert.match(manualReviewSource, /snapshot\.user\.planCode !== 'free'/);
  assert.match(WORKSPACE_STATUS_SOURCE, /isManualReview\(snapshot\)/);
  assert.doesNotMatch(
    manualReviewSource,
    /snapshot\.billing\.paymentActionRequired[\s\S]*waiting for admin\|verification\|review[\s\S]*snapshot\.billing\.status === 'active'/,
  );
});
