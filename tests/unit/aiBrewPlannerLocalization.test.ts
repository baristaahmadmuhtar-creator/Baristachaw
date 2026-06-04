import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPlanRecipeDescription,
  buildPlanRecipeIngredients,
  buildPlanRecipeName,
  buildPlanRecipeSteps,
} from '../../apps/web/src/features/ai-brew/planner.ts';
import {
  localizeAiBrewDynamicText,
  localizeAiBrewSummary,
} from '../../apps/web/src/features/ai-brew/localization.ts';

const mockPlan: any = {
  coffeeName: '',
  targetProfileLabel: 'Lebih Manis',
  dripper: { name: 'V60' },
  grinder: { name: 'Comandante' },
  brewMode: 'hot',
  methodFamily: 'v60',
  iceMl: 80,
  hotWaterMl: 220,
  finalBeverageRatio: 20,
  hotExtractionRatio: 14.67,
  recommendedRatio: 15,
  waterTempC: 93,
  totalTimeSeconds: 180,
  extractionEndSeconds: 180,
  waterBrandLabel: 'Aqua',
  waterCustomized: true,
  summary: 'Resep ringkas.',
  steps: [
    { label: 'Bloom', startSeconds: 0, pourVolumeMl: 60, targetVolumeMl: 60, note: 'Aduk pelan.' },
  ],
  doseG: 15,
  totalWaterMl: 300,
  waterMinerals: {
    tdsPpm: 90,
    hardnessPpm: 50,
    alkalinityPpm: 40,
  },
};

test('ai brew recipe copy switches to indonesian when locale=id', () => {
  const name = buildPlanRecipeName(mockPlan, 'id');
  const description = buildPlanRecipeDescription(mockPlan, 'id');
  const steps = buildPlanRecipeSteps(mockPlan, 'id');
  const ingredients = buildPlanRecipeIngredients(mockPlan, 'id');

  assert.match(name, /AI Seduh|Lebih Manis/);
  assert.match(description, /Perangkat:/);
  assert.match(description, /Air:/);
  assert.match(steps[0], /tuang/);
  assert.equal(ingredients[0].name, 'Kopi');
  assert.equal(ingredients[1].name, 'Total air akhir');
  assert.equal(ingredients[2].name, 'Air panas seduh');
  assert.equal(ingredients[3].name, 'Sumber air');
  assert.equal(ingredients[4].name, 'Mineral air');
  assert.equal(ingredients[5].name, 'Es');
});

test('AI Brew localized summaries use clean temperature text and no encoding artifacts', () => {
  const idSummary = localizeAiBrewSummary(mockPlan, 'id');
  const enSummary = localizeAiBrewSummary(mockPlan, 'en');

  assert.match(idSummary, /93°C|93 C/);
  assert.match(enSummary, /93°C|93 C/);
  assert.doesNotMatch(`${idSummary} ${enSummary}`, /\u00c2|\u00c3|â€|�/);
  assert.doesNotMatch(idSummary, /\b(hot drawdown finish|extraction time|this coffee)\b/i);
  assert.doesNotMatch(enSummary, /\b(seduh|air turun|kopi ini)\b/i);
});

test('AI Brew Indonesian dynamic copy polishes avoidable raw English brewing terms', () => {
  const raw = [
    'Put measured ice in the server, wet the coffee bed, and keep the slurry calm during drawdown.',
    'Use short pulses and avoid flooding the flat bed before service.',
    'Extend steep contact time before release, then stir server 5-8 seconds.',
  ].map((item) => localizeAiBrewDynamicText(item, 'id')).join(' ');

  assert.doesNotMatch(raw, /\b(server|coffee bed|bed|slurry|drawdown|flooding|steep|contact time|release|service)\b/i);
  assert.match(raw, /wadah saji/);
  assert.match(raw, /hamparan kopi|hamparan flat-bottom/);
  assert.match(raw, /campuran kopi/);
  assert.match(raw, /air turun/);
});

