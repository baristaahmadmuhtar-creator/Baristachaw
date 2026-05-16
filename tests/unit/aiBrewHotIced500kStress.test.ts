import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runAiBrewStressMatrix,
  writeAiBrewAggregateStressArtifacts,
  writeAiBrewBalancedStressArtifacts,
  type AiBrewStressRunResult,
} from '../helpers/aiBrewStressMatrix.ts';

const ENABLED = process.env.AI_BREW_500K_STRESS === '1';
const STRESS_TOTAL = 500000;
const BALANCED_HALF_TOTAL = 250000;

let hotResult: AiBrewStressRunResult | null = null;
let icedResult: AiBrewStressRunResult | null = null;
let balancedHotResult: AiBrewStressRunResult | null = null;
let balancedIcedResult: AiBrewStressRunResult | null = null;

function getHotResult() {
  hotResult ??= runAiBrewStressMatrix({ mode: 'hot', total: STRESS_TOTAL });
  return hotResult;
}

function getIcedResult() {
  icedResult ??= runAiBrewStressMatrix({ mode: 'iced', total: STRESS_TOTAL });
  return icedResult;
}

function getBalancedHotResult() {
  balancedHotResult ??= runAiBrewStressMatrix({ mode: 'hot', total: BALANCED_HALF_TOTAL });
  return balancedHotResult;
}

function getBalancedIcedResult() {
  balancedIcedResult ??= runAiBrewStressMatrix({ mode: 'iced', total: BALANCED_HALF_TOTAL });
  return balancedIcedResult;
}

function assertStressResult(result: AiBrewStressRunResult, mode: 'hot' | 'iced') {
  assert.equal(result.summary.requestedMode, mode);
  assert.equal(result.summary.total, STRESS_TOTAL);
  assert.equal(result.summary.passed, STRESS_TOTAL);
  assert.equal(result.failures.length, 0);
  assert.ok(result.summary.visibleDrippers >= 40);
  assert.equal(result.summary.targets, 8);
  assert.ok(result.summary.processes >= 90);
  assert.ok(result.summary.varieties >= 180);
  assert.ok(result.summary.grinders >= 6);
  assert.ok(result.summary.waterCases >= 10);
  assert.ok(Object.keys(result.summary.methodCounts).length >= 12);
  assert.ok(Object.keys(result.summary.targetCounts).length === 8);
  assert.ok(result.summary.scoreMin.recipeEnvelopeSafety >= 95);
  assert.ok(result.summary.scoreMin.methodGuideQuality >= 92);
  assert.ok(result.summary.scoreMin.confidenceHonesty >= 92);
  assert.ok(result.summary.scoreMin.expectedCupPlausibility >= 92);
  assert.ok(result.summary.scoreMin.correctionLoopUsefulness >= 92);
  assert.ok(result.artifactDir.includes(`${mode}-500k-stress`));
}

test('AI Brew 500000 hot stress matrix keeps global beans, water, grinders, targets, and guides safe', { skip: !ENABLED }, () => {
  assertStressResult(getHotResult(), 'hot');
});

test('AI Brew 500000 iced stress matrix keeps split, guide, taste, and unsupported-mode guardrails safe', { skip: !ENABLED }, () => {
  assertStressResult(getIcedResult(), 'iced');
  assert.ok(getIcedResult().summary.actualIcedPlans > 300000);
  assert.equal(getIcedResult().summary.icedSplitStats.exactSplitCount, getIcedResult().summary.actualIcedPlans);
  assert.equal(getIcedResult().summary.icedSplitStats.pourSumMatchesHotWaterCount, getIcedResult().summary.actualIcedPlans);
  assert.ok(getIcedResult().summary.unsupportedIcedFallbacks > 0);
});

test('AI Brew 1000000 hot+iced aggregate report writes scores and improvement prompt', { skip: !ENABLED }, () => {
  const aggregate = writeAiBrewAggregateStressArtifacts(getHotResult(), getIcedResult());
  assert.equal(aggregate.total, STRESS_TOTAL * 2);
  assert.equal(aggregate.passed, STRESS_TOTAL * 2);
  assert.equal(aggregate.failures, 0);
  assert.ok(aggregate.artifactDir.includes('hot-iced-1m-stress'));
  assert.ok(aggregate.files.some((file) => file.endsWith('recommendations.md')));
  assert.ok(aggregate.files.some((file) => file.endsWith('improvement-prompt.md')));
});

test('AI Brew 500000 balanced software brew stress covers 250000 hot and 250000 iced/cold cases', { skip: !ENABLED }, () => {
  const hot = getBalancedHotResult();
  const iced = getBalancedIcedResult();
  assert.equal(hot.summary.requestedMode, 'hot');
  assert.equal(iced.summary.requestedMode, 'iced');
  assert.equal(hot.summary.total, BALANCED_HALF_TOTAL);
  assert.equal(iced.summary.total, BALANCED_HALF_TOTAL);
  assert.equal(hot.summary.passed, BALANCED_HALF_TOTAL);
  assert.equal(iced.summary.passed, BALANCED_HALF_TOTAL);
  assert.equal(hot.failures.length + iced.failures.length, 0);
  assert.ok(hot.summary.visibleDrippers >= 40);
  assert.ok(iced.summary.actualIcedPlans > 200000);
  assert.ok(iced.summary.unsupportedIcedFallbacks > 0);
  assert.equal(iced.summary.icedSplitStats.exactSplitCount, iced.summary.actualIcedPlans);
  assert.equal(iced.summary.icedSplitStats.pourSumMatchesHotWaterCount, iced.summary.actualIcedPlans);
  const aggregate = writeAiBrewBalancedStressArtifacts(hot, iced);
  assert.equal(aggregate.total, STRESS_TOTAL);
  assert.equal(aggregate.passed, STRESS_TOTAL);
  assert.equal(aggregate.failures, 0);
  assert.ok(aggregate.artifactDir.includes('hot-iced-500k-balanced-stress'));
  assert.ok(aggregate.scoreMin.recipeEnvelopeSafety >= 95);
  assert.ok(aggregate.scoreMin.methodGuideQuality >= 92);
  assert.ok(aggregate.scoreMin.waterHonesty >= 92);
  assert.ok(aggregate.scoreMin.grinderConfidenceHonesty >= 92);
  assert.ok(aggregate.files.some((file) => file.endsWith('method-scores.csv')));
  assert.ok(aggregate.files.some((file) => file.endsWith('improvement-prompt.md')));
});
