import test from 'node:test';
import assert from 'node:assert/strict';
import { BREW_METHOD_MAP } from '../../apps/web/src/features/barista-tools/brewProfiles.ts';
import { buildRoastAdjustedTargets, mapAgtronToRoastLevel } from '../../apps/web/src/features/barista-tools/calculations.ts';

test('agtron mapping to roast level is consistent', () => {
  assert.equal(mapAgtronToRoastLevel(90), 'light');
  assert.equal(mapAgtronToRoastLevel(72), 'medium_light');
  assert.equal(mapAgtronToRoastLevel(56), 'medium');
  assert.equal(mapAgtronToRoastLevel(40), 'dark');
  assert.equal(mapAgtronToRoastLevel(28), 'dark');
});

test('medium roast remains neutral baseline for filter profile', () => {
  const v60 = BREW_METHOD_MAP.v60;
  const medium = buildRoastAdjustedTargets(v60, 'medium');
  assert.equal(medium.adjustment.tempDeltaC, 0);
  assert.equal(medium.adjustment.ratioDelta, 0);
  assert.equal(medium.adjustment.brewTimeDeltaSec, 0);
});

test('light and dark roast shifts stay in safe range for espresso', () => {
  const espresso = BREW_METHOD_MAP.espresso;
  const light = buildRoastAdjustedTargets(espresso, 'light');
  const dark = buildRoastAdjustedTargets(espresso, 'dark');

  assert.ok(light.adjustedTempRangeC[0] >= 85);
  assert.ok(light.adjustedTempRangeC[1] <= 100);
  assert.ok(dark.adjustedTempRangeC[0] >= 85);
  assert.ok(dark.adjustedTempRangeC[1] <= 100);
  assert.ok(light.adjustedRatioRange[0] > 0.5);
  assert.ok(dark.adjustedRatioRange[0] > 0.5);
});

test('batch category has valid roast deltas and medium remains neutral', () => {
  const batch = BREW_METHOD_MAP.batch_brew;
  const medium = buildRoastAdjustedTargets(batch, 'medium');
  const dark = buildRoastAdjustedTargets(batch, 'dark');
  const light = buildRoastAdjustedTargets(batch, 'light');

  assert.equal(medium.adjustment.ratioDelta, 0);
  assert.ok(light.adjustedBrewTimeRangeSec[0] > dark.adjustedBrewTimeRangeSec[0]);
  assert.ok(light.adjustedTempRangeC[0] > dark.adjustedTempRangeC[0]);
});

