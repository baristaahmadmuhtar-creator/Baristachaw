import test from 'node:test';
import assert from 'node:assert/strict';
import { BREW_METHOD_MAP } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';
import { evaluateConformance } from '../../apps/web/src/features/barista-tools/standards.ts';

test('conformance flags ratio miss for out-of-range filter ratio', () => {
  const result = evaluateConformance({
    method: BREW_METHOD_MAP.v60,
    doseG: 20,
    waterMl: 300,
    ratio: 10,
  });

  assert.ok(result.standardsMisses.length > 0);
  assert.ok(result.warnings.length > 0);
});

test('conformance keeps espresso free from filter baseline warning', () => {
  const result = evaluateConformance({
    method: BREW_METHOD_MAP.espresso,
    doseG: 18,
    waterMl: 36,
    ratio: 2,
  });

  assert.equal(result.warnings.some((warning) => /filter baseline|12-22/i.test(warning)), false);
});

test('conformance respects agtron-based roast mapping', () => {
  const result = evaluateConformance({
    method: BREW_METHOD_MAP.batch_brew,
    doseG: 60,
    waterMl: 960,
    ratio: 16,
  }, {
    agtronValue: 30,
  });

  assert.ok(result.standardsHits.length > 0);
});

test('conformance reports non-finite numeric input clearly', () => {
  const result = evaluateConformance({
    method: BREW_METHOD_MAP.v60,
    doseG: Number.NaN,
    waterMl: Number.POSITIVE_INFINITY,
    ratio: Number.NaN,
  });

  assert.ok(result.warnings.some((warning) => /finite numbers/i.test(warning)));
  assert.ok(result.standardsMisses.some((miss) => /invalid numeric input/i.test(miss)));
});

