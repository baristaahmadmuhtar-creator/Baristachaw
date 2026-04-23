import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPlanRecipeDescription,
  buildPlanRecipeIngredients,
  buildPlanRecipeName,
  buildPlanRecipeSteps,
} from '../../apps/web/src/features/ai-brew/planner.ts';

const mockPlan: any = {
  coffeeName: '',
  targetProfileLabel: 'Lebih Manis',
  dripper: { name: 'V60' },
  grinder: { name: 'Comandante' },
  iceMl: 80,
  hotWaterMl: 220,
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
  assert.equal(ingredients[1].name, 'Air');
  assert.equal(ingredients[2].name, 'Sumber air');
  assert.equal(ingredients[3].name, 'Mineral air');
  assert.equal(ingredients[4].name, 'Es');
});

