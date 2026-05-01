import test from 'node:test';
import assert from 'node:assert/strict';
import { BREW_METHOD_MAP } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';
import {
  buildRoastAdjustedTargets,
  buildBrewOutputs,
  calcDoseFromWaterRatio,
  calcExtractionYieldAdvanced,
  calcWaterFromDoseRatio,
  mapAgtronToRoastLevel,
} from '../../apps/web/src/features/barista-tools/calculations.ts';
import { validateBrewInputs } from '../../apps/web/src/features/barista-tools/standards.ts';

test('reciprocal ratio math is consistent', () => {
  const water = calcWaterFromDoseRatio(20, 16);
  assert.equal(water, 320);

  const dose = calcDoseFromWaterRatio(300, 16);
  assert.equal(dose, 18.75);
});

test('basic yield differs by method profile', () => {
  const v60 = buildBrewOutputs({
    method: BREW_METHOD_MAP.v60,
    doseG: 20,
    waterMl: 320,
    ratio: 16,
  });
  const chemex = buildBrewOutputs({
    method: BREW_METHOD_MAP.chemex,
    doseG: 20,
    waterMl: 320,
    ratio: 16,
  });

  assert.notEqual(v60.beverageOutputMl, chemex.beverageOutputMl);
  assert.ok(v60.beverageOutputMl > 0);
  assert.ok(chemex.beverageOutputMl > 0);
});

test('advanced extraction formula returns expected value', () => {
  const extraction = calcExtractionYieldAdvanced({
    doseG: 18,
    beverageOutputMl: 280,
    tdsPercent: 1.35,
  });
  assert.equal(extraction, 21);
});

test('espresso beverage output follows dose x ratio yield target', () => {
  const espresso = buildBrewOutputs({
    method: BREW_METHOD_MAP.espresso,
    doseG: 18,
    waterMl: 36,
    ratio: 2,
  });
  assert.equal(espresso.beverageOutputMl, 36);
  assert.equal(espresso.waterRetainedMl, 0);
});

test('guardrails catch out-of-range ratio', () => {
  const guard = validateBrewInputs({
    method: BREW_METHOD_MAP.v60,
    doseG: 18,
    waterMl: 180,
    ratio: 10,
  });
  assert.equal(guard.errors.length, 0);
  assert.ok(guard.warnings.length > 0);
});

test('includes espresso shot presets', () => {
  assert.ok(BREW_METHOD_MAP.espresso);
  assert.equal(BREW_METHOD_MAP.espresso.ratioDefault, 2);
  assert.ok(BREW_METHOD_MAP.espresso.shotPresets?.some((preset) => preset.id === 'ristretto'));
  assert.ok(BREW_METHOD_MAP.espresso.shotPresets?.some((preset) => preset.id === 'doppio'));
});

test('espresso basic mode does not warn with filter-only tds guidance', () => {
  const guard = validateBrewInputs({
    method: BREW_METHOD_MAP.espresso,
    doseG: 18,
    waterMl: 36,
    ratio: 2,
    tdsPercent: 10,
  });
  assert.equal(guard.errors.length, 0);
  assert.equal(guard.warnings.some((w) => /typical filter range/i.test(w)), false);
});

test('espresso ratio uses espresso policy and avoids filter baseline warning', () => {
  const guard = validateBrewInputs({
    method: BREW_METHOD_MAP.espresso,
    doseG: 18,
    waterMl: 36,
    ratio: 2,
  });
  assert.equal(guard.errors.length, 0);
  assert.equal(guard.warnings.some((w) => /SCA-style filter baseline|12-22/i.test(w)), false);
});

test('contextual concentrate methods do not reuse the typical filter TDS warning', () => {
  for (const methodId of ['aeropress', 'moka_pot', 'cold_brew'] as const) {
    const method = BREW_METHOD_MAP[methodId];
    const guard = validateBrewInputs({
      method,
      doseG: methodId === 'moka_pot' ? 18 : 20,
      waterMl: calcWaterFromDoseRatio(methodId === 'moka_pot' ? 18 : 20, method.ratioDefault),
      ratio: method.ratioDefault,
      tdsPercent: methodId === 'cold_brew' ? 3.2 : 2.8,
    });

    assert.equal(
      guard.warnings.some((warning) => /typical filter range/i.test(warning)),
      false,
      `${methodId} should not use the hot-filter TDS warning`,
    );
  }
});

test('roast-adjusted targets shift with light and dark levels', () => {
  const light = buildRoastAdjustedTargets(BREW_METHOD_MAP.v60, 'light');
  const dark = buildRoastAdjustedTargets(BREW_METHOD_MAP.v60, 'dark');
  assert.ok(light.adjustedTempRangeC[0] > dark.adjustedTempRangeC[0]);
  assert.ok(light.adjustedBrewTimeRangeSec[0] > dark.adjustedBrewTimeRangeSec[0]);
});

test('agtron mapping returns stable roast bands', () => {
  assert.equal(mapAgtronToRoastLevel(92), 'light');
  assert.equal(mapAgtronToRoastLevel(60), 'medium');
  assert.equal(mapAgtronToRoastLevel(30), 'dark');
});

test('all method outputs stay finite for baseline inputs', () => {
  for (const method of Object.values(BREW_METHOD_MAP)) {
    const doseG = method.id === 'espresso' ? 18 : 20;
    const ratio = method.id === 'espresso' ? 2 : method.ratioDefault;
    const waterMl = calcWaterFromDoseRatio(doseG, ratio);
    const output = buildBrewOutputs({
      method,
      doseG,
      waterMl,
      ratio,
      tdsPercent: method.category === 'espresso' ? 9.5 : 1.35,
    });

    assert.ok(Number.isFinite(output.waterRetainedMl), `${method.id} retained should be finite`);
    assert.ok(Number.isFinite(output.processLossMl), `${method.id} process loss should be finite`);
    assert.ok(Number.isFinite(output.beverageOutputMl), `${method.id} output ml should be finite`);
    assert.ok(Number.isFinite(output.beverageOutputOz), `${method.id} output oz should be finite`);
  }
});

test('corrupted numeric inputs never return non-finite brew outputs', () => {
  const output = buildBrewOutputs({
    method: BREW_METHOD_MAP.v60,
    doseG: Number.POSITIVE_INFINITY,
    waterMl: Number.NaN,
    ratio: Number.NEGATIVE_INFINITY,
    tdsPercent: Number.NaN,
    measuredOutputMl: Number.POSITIVE_INFINITY,
  });

  assert.equal(output.waterRetainedMl, 0);
  assert.equal(output.processLossMl, 8);
  assert.equal(output.beverageOutputMl, 0);
  assert.equal(output.beverageOutputOz, 0);
});

