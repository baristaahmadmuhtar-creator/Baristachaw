import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAiBrewPlan,
  createDefaultAiBrewFormState,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import { buildProductionAiBrewCatalogForStress } from '../helpers/aiBrewStressMatrix.ts';

test('AI Brew keeps not-recommended espresso grinders low-confidence with a hard warning', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const espresso = catalog.drippers.find((item) => /espresso/i.test(`${item.name} ${item.typeLabel}`));
  const timemoreC2 = catalog.grinders.find((item) => /timemore\s*c2/i.test(`${item.name} ${item.searchText}`));
  assert.ok(espresso, 'espresso dripper fixture must exist');
  assert.ok(timemoreC2, 'Timemore C2 fixture must exist');

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Espresso honesty QA',
    process: 'washed',
    variety: 'bourbon',
    roastLevel: 'medium_dark',
    dripperId: espresso.id,
    grinderId: timemoreC2.id,
    doseG: '18',
    targetWaterMl: '40',
    targetProfileId: 'soft_round',
    waterMode: 'manual',
    waterBrandId: '',
    waterTdsPpm: '90',
    waterHardnessPpm: '45',
    waterAlkalinityPpm: '35',
  }, catalog);

  const diagnostics = [
    plan.grindSettingReference,
    ...plan.confidenceNotes,
    ...(plan.expectedCupProfile?.warnings || []),
  ].join(' ');
  assert.equal(plan.grindSettingVerification, 'fallback');
  assert.equal(plan.expectedCupProfile?.confidence, 'low');
  assert.match(diagnostics, /not recommended|not recommended for espresso|espresso-capable|tidak disarankan/i);
});

test('AI Brew treats manual zero-mineral water as not brew-ready', () => {
  const catalog = buildProductionAiBrewCatalogForStress();
  const v60 = catalog.drippers.find((item) => /\bv60\b/i.test(`${item.name} ${item.typeLabel}`));
  assert.ok(v60, 'V60 fixture must exist');

  const plan = buildAiBrewPlan({
    ...createDefaultAiBrewFormState(catalog),
    coffeeName: 'Zero mineral honesty QA',
    process: 'washed',
    variety: 'gesha',
    roastLevel: 'light',
    dripperId: v60.id,
    grinderId: '1zpresso-k-ultra',
    targetProfileId: 'floral_transparent',
    waterMode: 'manual',
    waterBrandId: '',
    waterTdsPpm: '0',
    waterHardnessPpm: '0',
    waterAlkalinityPpm: '0',
    waterCustomized: true,
    waterNotes: 'RO zero mineral base water',
  }, catalog);

  assert.equal(plan.waterIsBrewReady, false);
  assert.equal(plan.expectedCupProfile?.confidence, 'low');
  assert.ok((plan.readinessScores?.water || 100) < 60);
  assert.match([
    ...plan.warnings,
    ...(plan.expectedCupProfile?.warnings || []),
  ].join(' '), /zero|mineral|RO|remineral/i);
});
