import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPredictionPrecision } from '../../apps/web/src/features/ai-brew/predictionPrecision.ts';

test('prediction precision rewards complete, validated inputs without claiming certainty', () => {
  const result = buildPredictionPrecision({
    readinessScores: {
      recipe: 96,
      water: 94,
      grinder: 97,
      workflow: 100,
      catalog: 94,
    },
    beanCoverage: { category: 'known_high', confidence: 'high' },
    expectedCupConfidence: 'high',
    workflowStatus: 'ready',
    guardrailErrorCount: 0,
  });

  assert.equal(result.score, 96);
  assert.equal(result.band, 'high');
});

test('prediction precision is capped when bean identity is incomplete', () => {
  const result = buildPredictionPrecision({
    readinessScores: {
      recipe: 98,
      water: 94,
      grinder: 97,
      workflow: 100,
      catalog: 94,
    },
    beanCoverage: { category: 'unknown_fallback', confidence: 'low' },
    expectedCupConfidence: 'medium',
    workflowStatus: 'ready',
    guardrailErrorCount: 0,
  });

  assert.equal(result.score, 64);
  assert.equal(result.band, 'baseline');
});

test('prediction precision falls to blocked when workflow or guardrails fail', () => {
  const result = buildPredictionPrecision({
    readinessScores: {
      recipe: 90,
      water: 90,
      grinder: 90,
      workflow: 40,
      catalog: 90,
    },
    beanCoverage: { category: 'unsupported_unsafe', confidence: 'low' },
    expectedCupConfidence: 'low',
    workflowStatus: 'blocked',
    guardrailErrorCount: 1,
  });

  assert.equal(result.band, 'blocked');
  assert.ok(result.score <= 39);
});
