import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runAiBrewStressMatrix,
  writeAiBrewAggregateStressArtifacts,
  type AiBrewStressRunResult,
} from '../helpers/aiBrewStressMatrix.ts';

const ENABLED = process.env.AI_BREW_500K_STRESS === '1';
const STRESS_TOTAL = 500000;

let hotResult: AiBrewStressRunResult | null = null;
let icedResult: AiBrewStressRunResult | null = null;

function getHotResult() {
  hotResult ??= runAiBrewStressMatrix({ mode: 'hot', total: STRESS_TOTAL });
  return hotResult;
}

function getIcedResult() {
  icedResult ??= runAiBrewStressMatrix({ mode: 'iced', total: STRESS_TOTAL });
  return icedResult;
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
