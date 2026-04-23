import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRatioSettingsFromStorage, migrateRatioSettings } from '../../apps/web/src/features/barista-tools/ratioState.ts';

test('migrates legacy coffee_machine state to v5 espresso and sanitizes invalid numeric fields', () => {
  const migrated = migrateRatioSettings({
    v: 4,
    methodId: 'coffee_machine',
    mode: 'basic',
    dose: 'Infinity',
    water: 'NaN',
    ratio: 'Infinity',
    tdsPercent: 'abc',
    measuredOutput: '1e999',
    agtronValue: '-5',
    roastLevel: 'dark',
    roastInputMode: 'agtron',
  });

  assert.equal(migrated.v, 5);
  assert.equal(migrated.methodId, 'espresso');
  assert.equal(migrated.mode, 'basic');
  assert.equal(migrated.roastLevel, 'medium');
  assert.equal(migrated.agtronValue, '');
  assert.equal(migrated.dose, '18');
  assert.equal(migrated.ratio, '2');
  assert.equal(migrated.water, '36');
  assert.equal(migrated.tdsPercent, '');
  assert.equal(migrated.measuredOutput, '');
});

test('loads from legacy v4 storage key and upgrades to v5', () => {
  const storage = {
    getItem(key: string) {
      if (key !== 'BARISTA_TOOLS_RATIO_V4') return null;
      return JSON.stringify({
        v: 4,
        methodId: 'v60',
        mode: 'advanced',
        ratio: '15.5',
        dose: '20',
        water: '310',
        roastLevel: 'medium_light',
      });
    },
  };

  const loaded = loadRatioSettingsFromStorage(storage);
  assert.equal(loaded.v, 5);
  assert.equal(loaded.methodId, 'v60');
  assert.equal(loaded.mode, 'advanced');
  assert.equal(loaded.ratio, '15.5');
  assert.equal(loaded.dose, '20');
  assert.equal(loaded.water, '310');
  assert.equal(loaded.roastLevel, 'medium_light');
});

